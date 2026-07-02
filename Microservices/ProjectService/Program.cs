using System.Data;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "ProjectHub.Shared.Secret.Key.For.Student.Microservices.2026!";
var issuer = builder.Configuration["Jwt:Issuer"] ?? "ProjectHub";
var audience = builder.Configuration["Jwt:Audience"] ?? "ProjectHub.Client";

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => options.TokenValidationParameters = TokenValidation(jwtSecret, issuer, audience));
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();

var db = new SqlDb(app.Configuration.GetConnectionString("ProjectDb")!);
await db.EnsureDatabaseAsync("ProjectDB");
await EnsureSchemaAsync(db);

app.MapGet("/health", () => Results.Ok(new { service = "ProjectService", status = "ok" }));

app.MapGet("/api/projects", async () =>
{
    await using var conn = await db.OpenAsync();
    var projects = await QueryAsync<ProjectRow>(conn,
        "SELECT id, name, description, status, statusText, progress, color, createdAt, budget, startDate, endDate FROM Projects ORDER BY createdAt DESC");
    var members = await QueryAsync<ProjectMemberRow>(conn,
        "SELECT projectId, userId, role, hourlyRate FROM ProjectMembers");
    var result = projects.Select(project => new ProjectDto(
        project.Id,
        project.Name,
        project.Description,
        project.Status,
        project.StatusText,
        project.Progress,
        project.Color,
        project.CreatedAt,
        members.Where(m => m.ProjectId == project.Id)
            .Select(m => new MemberDto(m.UserId, m.UserId, "", m.Role, true, "", m.HourlyRate))
            .ToList(),
        project.Budget,
        project.StartDate,
        project.EndDate));
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPost("/api/projects", async (ProjectCreateRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    var id = "p_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var createdAt = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        INSERT INTO Projects(id, name, description, status, statusText, progress, color, createdAt, budget, startDate, endDate)
        VALUES(@id,@name,@description,@status,@statusText,0,@color,@createdAt,@budget,@startDate,@endDate)
        """,
        P("@id", id), P("@name", request.Name), P("@description", request.Description),
        P("@status", request.Status), P("@statusText", request.StatusText),
        P("@color", request.Color), P("@createdAt", createdAt), P("@budget", request.Budget),
        P("@startDate", request.StartDate), P("@endDate", request.EndDate));

    foreach (var member in request.Members ?? [])
    {
        await ExecuteAsync(conn,
            "INSERT INTO ProjectMembers(projectId, userId, role, hourlyRate) VALUES(@projectId,@userId,@role,@hourlyRate)",
            P("@projectId", id), P("@userId", member.Id), P("@role", string.IsNullOrWhiteSpace(member.Role) ? "Member" : member.Role), P("@hourlyRate", member.HourlyRate));
    }

    var dto = new ProjectDto(id, request.Name, request.Description, request.Status, request.StatusText, 0, request.Color, createdAt, request.Members ?? [], request.Budget, request.StartDate, request.EndDate);
    return Results.Created($"/api/projects/{id}", dto);
}).RequireAuthorization();

app.MapPut("/api/projects/{id}/progress", async (string id, ProjectProgressRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "UPDATE Projects SET progress=@progress WHERE id=@id", P("@progress", request.Progress), P("@id", id));
    return Results.Ok(new { message = "Cập nhật tiến độ thành công" });
}).RequireAuthorization();

app.MapPut("/api/projects/{id}/members", async (string id, ProjectMembersRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "DELETE FROM ProjectMembers WHERE projectId=@projectId", P("@projectId", id));
    foreach (var member in request.Members)
    {
        await ExecuteAsync(conn,
            "INSERT INTO ProjectMembers(projectId, userId, role, hourlyRate) VALUES(@projectId,@userId,@role,@hourlyRate)",
            P("@projectId", id), P("@userId", member.UserId), P("@role", string.IsNullOrWhiteSpace(member.Role) ? "Member" : member.Role), P("@hourlyRate", member.HourlyRate));
    }
    return Results.Ok(new { message = "Cập nhật thành viên thành công" });
}).RequireAuthorization();

app.MapPost("/api/projects/{id}/sprints", async (string id, SprintCreateRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    var sprintId = "sp_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        "INSERT INTO Sprints(id, projectId, name, goal, startDate, endDate) VALUES(@id,@projectId,@name,@goal,@startDate,@endDate)",
        P("@id", sprintId), P("@projectId", id), P("@name", request.Name), P("@goal", request.Goal),
        P("@startDate", request.StartDate), P("@endDate", request.EndDate));
    return Results.Created($"/api/projects/{id}/sprints/{sprintId}", new { id = sprintId, projectId = id, request.Name, request.Goal, request.StartDate, request.EndDate });
}).RequireAuthorization();

app.MapGet("/api/projects/{id}/sprints", async (string id) =>
{
    await using var conn = await db.OpenAsync();
    var sprints = await QueryAsync<SprintRow>(conn,
        "SELECT id, projectId, name, goal, startDate, endDate FROM Sprints WHERE projectId = @projectId",
        P("@projectId", id));
    return Results.Ok(sprints);
}).RequireAuthorization();

app.MapPut("/api/projects/{id}", async (string id, ProjectUpdateRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        UPDATE Projects 
        SET name = @name, description = @description, status = @status, statusText = @statusText, color = @color, budget = @budget, startDate = @startDate, endDate = @endDate 
        WHERE id = @id
        """,
        P("@name", request.Name), P("@description", request.Description),
        P("@status", request.Status), P("@statusText", request.StatusText),
        P("@color", request.Color), P("@budget", request.Budget),
        P("@startDate", request.StartDate), P("@endDate", request.EndDate), P("@id", id));
    return Results.Ok(new { message = "Cập nhật dự án thành công" });
}).RequireAuthorization();

app.MapGet("/api/projects/{id}/attendance", async (string id, string date) =>
{
    await using var conn = await db.OpenAsync();
    var list = await QueryAsync<AttendanceRow>(conn,
        "SELECT id, projectId, date, userId, status, overtimeHours, notes FROM Attendance WHERE projectId = @projectId AND date = @date",
        P("@projectId", id), P("@date", date));
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/api/projects/{id}/attendance", async (string id, AttendanceSaveRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(principal)) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    foreach (var record in request.Records)
    {
        var rowsAffected = await ExecuteAsync(conn,
            """
            UPDATE Attendance 
            SET status = @status, overtimeHours = @overtimeHours, notes = @notes 
            WHERE projectId = @projectId AND date = @date AND userId = @userId
            """,
            P("@status", record.Status), P("@overtimeHours", record.OvertimeHours), P("@notes", record.Notes),
            P("@projectId", id), P("@date", request.Date), P("@userId", record.UserId));
        
        if (rowsAffected == 0)
        {
            var attId = "att_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + "_" + record.UserId;
            await ExecuteAsync(conn,
                """
                INSERT INTO Attendance(id, projectId, date, userId, status, overtimeHours, notes)
                VALUES(@id, @projectId, @date, @userId, @status, @overtimeHours, @notes)
                """,
                P("@id", attId), P("@projectId", id), P("@date", request.Date), P("@userId", record.UserId),
                P("@status", record.Status), P("@overtimeHours", record.OvertimeHours), P("@notes", record.Notes));
        }
    }
    return Results.Ok(new { message = "Lưu điểm danh thành công" });
}).RequireAuthorization();

app.MapGet("/api/projects/{id}/attendance/all", async (string id) =>
{
    await using var conn = await db.OpenAsync();
    var list = await QueryAsync<AttendanceRow>(conn,
        "SELECT id, projectId, date, userId, status, overtimeHours, notes FROM Attendance WHERE projectId = @projectId",
        P("@projectId", id));
    return Results.Ok(list);
}).RequireAuthorization();

app.Run();

static TokenValidationParameters TokenValidation(string secret, string issuer, string audience) => new()
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateIssuerSigningKey = true,
    ValidIssuer = issuer,
    ValidAudience = audience,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
    ClockSkew = TimeSpan.Zero
};

static bool IsManager(ClaimsPrincipal user)
{
    var role = user.FindFirstValue(ClaimTypes.Role);
    return role is "Admin" or "Project Manager";
}

static async Task EnsureSchemaAsync(SqlDb db)
{
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' AND xtype='U')
        CREATE TABLE Projects(
            id NVARCHAR(50) PRIMARY KEY,
            name NVARCHAR(255) NOT NULL,
            description NVARCHAR(MAX),
            status NVARCHAR(50),
            statusText NVARCHAR(100),
            progress INT DEFAULT 0,
            color NVARCHAR(50),
            createdAt NVARCHAR(50),
            budget INT DEFAULT 0 NOT NULL
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProjectMembers' AND xtype='U')
        CREATE TABLE ProjectMembers(
            projectId NVARCHAR(50) NOT NULL,
            userId NVARCHAR(50) NOT NULL,
            role NVARCHAR(50) DEFAULT 'Member',
            hourlyRate INT DEFAULT 0 NOT NULL,
            PRIMARY KEY(projectId, userId)
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Sprints' AND xtype='U')
        CREATE TABLE Sprints(
            id NVARCHAR(50) PRIMARY KEY,
            projectId NVARCHAR(50) NOT NULL,
            name NVARCHAR(255) NOT NULL,
            goal NVARCHAR(MAX),
            startDate NVARCHAR(50),
            endDate NVARCHAR(50)
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Attendance' AND xtype='U')
        CREATE TABLE Attendance(
            id NVARCHAR(50) PRIMARY KEY,
            projectId NVARCHAR(50) NOT NULL,
            date NVARCHAR(50) NOT NULL,
            userId NVARCHAR(50) NOT NULL,
            status NVARCHAR(50) NOT NULL,
            overtimeHours INT DEFAULT 0,
            notes NVARCHAR(MAX),
            CONSTRAINT UC_Project_Date_User UNIQUE (projectId, date, userId)
        );

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Projects') AND name = N'budget')
        ALTER TABLE Projects ADD budget INT DEFAULT 0 NOT NULL;

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'ProjectMembers') AND name = N'hourlyRate')
        ALTER TABLE ProjectMembers ADD hourlyRate INT DEFAULT 0 NOT NULL;

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Projects') AND name = N'startDate')
        ALTER TABLE Projects ADD startDate NVARCHAR(50);

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Projects') AND name = N'endDate')
        ALTER TABLE Projects ADD endDate NVARCHAR(50);
        """);
}

static async Task<List<T>> QueryAsync<T>(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddRange(parameters);
    await using var reader = await cmd.ExecuteReaderAsync();
    var list = new List<T>();
    while (await reader.ReadAsync()) list.Add(Map<T>(reader));
    return list;
}

static async Task<int> ExecuteAsync(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddRange(parameters);
    return await cmd.ExecuteNonQueryAsync();
}

static SqlParameter P(string name, object? value) => new(name, value ?? DBNull.Value);

static T Map<T>(IDataRecord row)
{
    object? Get(string name) => row[name] == DBNull.Value ? null : row[name];
    if (typeof(T) == typeof(ProjectRow))
        return (T)(object)new ProjectRow(Get("id")!.ToString()!, Get("name")!.ToString()!, Get("description")?.ToString() ?? "", Get("status")?.ToString() ?? "New", Get("statusText")?.ToString() ?? "", Convert.ToInt32(Get("progress") ?? 0), Get("color")?.ToString() ?? "indigo", Get("createdAt")?.ToString() ?? "", Convert.ToInt32(Get("budget") ?? 0), Get("startDate")?.ToString() ?? "", Get("endDate")?.ToString() ?? "");
    if (typeof(T) == typeof(ProjectMemberRow))
        return (T)(object)new ProjectMemberRow(Get("projectId")!.ToString()!, Get("userId")!.ToString()!, Get("role")?.ToString() ?? "Member", Convert.ToInt32(Get("hourlyRate") ?? 0));
    if (typeof(T) == typeof(SprintRow))
        return (T)(object)new SprintRow(Get("id")!.ToString()!, Get("projectId")!.ToString()!, Get("name")!.ToString()!, Get("goal")?.ToString() ?? "", Get("startDate")?.ToString() ?? "", Get("endDate")?.ToString() ?? "");
    if (typeof(T) == typeof(AttendanceRow))
        return (T)(object)new AttendanceRow(Get("id")!.ToString()!, Get("projectId")!.ToString()!, Get("date")!.ToString()!, Get("userId")!.ToString()!, Get("status")!.ToString()!, Convert.ToInt32(Get("overtimeHours") ?? 0), Get("notes")?.ToString() ?? "");
    throw new NotSupportedException(typeof(T).Name);
}

sealed class SqlDb(string connectionString)
{
    public async Task EnsureDatabaseAsync(string databaseName)
    {
        var master = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master" }.ConnectionString;
        await using var conn = await OpenWithRetryAsync(master);
        await using var cmd = new SqlCommand($"IF DB_ID(N'{databaseName.Replace("'", "''")}') IS NULL CREATE DATABASE [{databaseName}]", conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public Task<SqlConnection> OpenAsync()
    {
        return OpenWithRetryAsync(connectionString);
    }

    static async Task<SqlConnection> OpenWithRetryAsync(string cs)
    {
        const int maxAttempts = 30;
        for (var attempt = 1; ; attempt++)
        {
            var conn = new SqlConnection(cs);
            try
            {
                await conn.OpenAsync();
                return conn;
            }
            catch (SqlException) when (attempt < maxAttempts)
            {
                await conn.DisposeAsync();
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
    }
}

record ProjectCreateRequest(string Name, string Description, string Status, string StatusText, string Color, List<MemberDto>? Members, int Budget, string StartDate, string EndDate);
record ProjectUpdateRequest(string Name, string Description, string Status, string StatusText, string Color, int Budget, string StartDate, string EndDate);
record ProjectProgressRequest(int Progress);
record MemberRoleRateDto(string UserId, string Role, int HourlyRate);
record ProjectMembersRequest(List<MemberRoleRateDto> Members);
record SprintCreateRequest(string Name, string Goal, string StartDate, string EndDate);
record SprintRow(string Id, string ProjectId, string Name, string Goal, string StartDate, string EndDate);
record ProjectRow(string Id, string Name, string Description, string Status, string StatusText, int Progress, string Color, string CreatedAt, int Budget, string StartDate, string EndDate);
record ProjectMemberRow(string ProjectId, string UserId, string Role, int HourlyRate);
record ProjectDto(string Id, string Name, string Description, string Status, string StatusText, int Progress, string Color, string CreatedAt, List<MemberDto> Members, int Budget, string StartDate, string EndDate);
record MemberDto(string Id, string FullName, string AvatarUrl, string Role, bool IsOnline, string Email, int HourlyRate);

record AttendanceRow(string Id, string ProjectId, string Date, string UserId, string Status, int OvertimeHours, string Notes);
record AttendanceDto(string UserId, string Status, int OvertimeHours, string Notes);
record AttendanceSaveRequest(string Date, List<AttendanceDto> Records);
