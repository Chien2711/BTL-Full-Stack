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
builder.Services.AddHttpClient("notify", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:NotifyService"] ?? "http://localhost:5003");
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => options.TokenValidationParameters = TokenValidation(jwtSecret, issuer, audience));
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();

var db = new SqlDb(app.Configuration.GetConnectionString("TaskDb")!);
await db.EnsureDatabaseAsync("TaskDB");
await EnsureSchemaAsync(db);

app.MapGet("/health", () => Results.Ok(new { service = "TaskService", status = "ok" }));

app.MapGet("/api/tasks", async (ClaimsPrincipal principal) =>
{
    await using var conn = await db.OpenAsync();
    var user = CurrentUser(principal);
    var sql = IsManager(user) || IsViewer(user)
        ? "SELECT * FROM Tasks ORDER BY createdAt DESC"
        : "SELECT * FROM Tasks WHERE ',' + ISNULL(assigneeId,'') + ',' LIKE '%,' + @userId + ',%' ORDER BY createdAt DESC";
    var tasks = await QueryAsync<TaskRow>(conn, sql, P("@userId", user.Id));
    var subtasks = await QueryAsync<SubTaskDto>(conn, "SELECT id, taskId, title, CAST(isCompleted AS bit) AS isCompleted FROM SubTasks");
    var logs = await QueryAsync<WorkLogDto>(conn, "SELECT id, taskId, userName, hours, description, createdAt FROM WorkLogs");
    var result = tasks.Select(t => ToDto(t,
        subtasks.Where(s => s.TaskId == t.Id).Select(s => new SubTaskClientDto(s.Id, s.Title, s.IsCompleted)).ToList(),
        logs.Where(l => l.TaskId == t.Id).Select(l => new WorkLogClientDto(l.Id, l.UserName, l.Hours, l.Description, l.CreatedAt)).ToList()));
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPost("/api/tasks", async (TaskCreateRequest request, ClaimsPrincipal principal, IHttpClientFactory httpClientFactory) =>
{
    if (!IsManager(CurrentUser(principal))) return Results.Forbid();
    var user = CurrentUser(principal);
    var id = "t_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var createdAt = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
    var labels = string.Join(",", request.Labels ?? []);
    var creatorId = string.IsNullOrWhiteSpace(request.CreatorId) ? user.Id : request.CreatorId;

    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        INSERT INTO Tasks(id,title,description,status,priority,dueDate,projectId,assigneeId,creatorId,createdAt,labels,estimatedHours,loggedHours)
        VALUES(@id,@title,@description,@status,@priority,@dueDate,@projectId,@assigneeId,@creatorId,@createdAt,@labels,@estimatedHours,0)
        """,
        P("@id", id), P("@title", request.Title), P("@description", request.Description),
        P("@status", request.Status), P("@priority", request.Priority), P("@dueDate", request.DueDate),
        P("@projectId", request.ProjectId), P("@assigneeId", (object?)request.AssigneeId ?? DBNull.Value),
        P("@creatorId", creatorId), P("@createdAt", createdAt), P("@labels", labels),
        P("@estimatedHours", request.EstimatedHours));

    if (!string.IsNullOrWhiteSpace(request.AssigneeId))
    {
        await PublishTaskEventAsync(httpClientFactory, new TaskEventRequest(
            "task.assigned",
            "Bạn được giao công việc",
            $"{user.FullName} đã giao công việc \"{request.Title}\" cho bạn.",
            id,
            request.ProjectId,
            SplitIds(request.AssigneeId),
            user));
    }

    return Results.Created($"/api/tasks/{id}", ToDto(new TaskRow(id, request.Title, request.Description, request.Status, request.Priority, request.DueDate, request.ProjectId, request.AssigneeId, creatorId, createdAt, labels, request.EstimatedHours, 0), [], []));
}).RequireAuthorization();

app.MapPut("/api/tasks/{id}", async (string id, TaskUpdateRequest request, ClaimsPrincipal principal, IHttpClientFactory httpClientFactory) =>
{
    if (!IsManager(CurrentUser(principal))) return Results.Forbid();
    var user = CurrentUser(principal);
    await using var conn = await db.OpenAsync();
    var oldTask = await QuerySingleAsync<TaskRow>(conn, "SELECT * FROM Tasks WHERE id=@id", P("@id", id));
    if (oldTask is null) return Results.NotFound();
    var labels = string.Join(",", request.Labels ?? []);
    await ExecuteAsync(conn,
        """
        UPDATE Tasks SET title=@title, description=@description, status=@status, priority=@priority,
        dueDate=@dueDate, projectId=@projectId, assigneeId=@assigneeId, creatorId=@creatorId,
        labels=@labels, estimatedHours=@estimatedHours WHERE id=@id
        """,
        P("@id", id), P("@title", request.Title), P("@description", request.Description),
        P("@status", request.Status), P("@priority", request.Priority), P("@dueDate", request.DueDate),
        P("@projectId", request.ProjectId), P("@assigneeId", (object?)request.AssigneeId ?? DBNull.Value),
        P("@creatorId", request.CreatorId), P("@labels", labels), P("@estimatedHours", request.EstimatedHours));

    if (oldTask.Status != request.Status)
    {
        await PublishTaskEventAsync(httpClientFactory, new TaskEventRequest(
            "task.status.changed",
            "Trạng thái công việc thay đổi",
            $"{user.FullName} đổi trạng thái \"{request.Title}\" từ {oldTask.Status} sang {request.Status}.",
            id,
            request.ProjectId,
            SplitIds(request.AssigneeId).Append(request.CreatorId).Distinct().ToList(),
            user));
    }

    var updated = await QuerySingleAsync<TaskRow>(conn, "SELECT * FROM Tasks WHERE id=@id", P("@id", id));
    return Results.Ok(ToDto(updated!, [], []));
}).RequireAuthorization();

app.MapPatch("/api/tasks/{id}/status", async (string id, StatusRequest request, ClaimsPrincipal principal, IHttpClientFactory httpClientFactory) =>
{
    var user = CurrentUser(principal);
    if (IsViewer(user)) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    var task = await QuerySingleAsync<TaskRow>(conn, "SELECT * FROM Tasks WHERE id=@id", P("@id", id));
    if (task is null) return Results.NotFound();
    if (!IsManager(user) && !SplitIds(task.AssigneeId).Contains(user.Id)) return Results.Forbid();
    await ExecuteAsync(conn, "UPDATE Tasks SET status=@status WHERE id=@id", P("@status", request.Status), P("@id", id));
    await PublishTaskEventAsync(httpClientFactory, new TaskEventRequest(
        "task.status.changed",
        "Trạng thái công việc thay đổi",
        $"{user.FullName} đổi trạng thái \"{task.Title}\" từ {task.Status} sang {request.Status}.",
        id,
        task.ProjectId,
        SplitIds(task.AssigneeId).Append(task.CreatorId).Distinct().ToList(),
        user));
    return Results.Ok(ToDto(task with { Status = request.Status }, [], []));
}).RequireAuthorization();

app.MapDelete("/api/tasks/{id}", async (string id, ClaimsPrincipal principal) =>
{
    if (!IsManager(CurrentUser(principal))) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "DELETE FROM Tasks WHERE id=@id", P("@id", id));
    return Results.Ok(new { id });
}).RequireAuthorization();

app.MapPost("/api/tasks/{id}/subtasks", async (string id, SubTaskRequest request, ClaimsPrincipal principal) =>
{
    if (!IsManager(CurrentUser(principal))) return Results.Forbid();
    var subId = "sub_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "INSERT INTO SubTasks(id, taskId, title, isCompleted) VALUES(@id,@taskId,@title,0)",
        P("@id", subId), P("@taskId", id), P("@title", request.Title));
    return Results.Created($"/api/tasks/{id}/subtasks/{subId}", new SubTaskClientDto(subId, request.Title, false));
}).RequireAuthorization();

app.MapPut("/api/tasks/{id}/subtasks/{subTaskId}/toggle", async (string id, string subTaskId, ClaimsPrincipal principal) =>
{
    if (IsViewer(CurrentUser(principal))) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "UPDATE SubTasks SET isCompleted = CASE WHEN isCompleted=1 THEN 0 ELSE 1 END WHERE id=@id AND taskId=@taskId", P("@id", subTaskId), P("@taskId", id));
    return Results.Ok();
}).RequireAuthorization();

app.MapDelete("/api/tasks/{id}/subtasks/{subTaskId}", async (string id, string subTaskId, ClaimsPrincipal principal) =>
{
    if (!IsManager(CurrentUser(principal))) return Results.Forbid();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "DELETE FROM SubTasks WHERE id=@id AND taskId=@taskId", P("@id", subTaskId), P("@taskId", id));
    return Results.Ok();
}).RequireAuthorization();

app.MapPost("/api/tasks/{id}/worklogs", async (string id, WorkLogRequest request, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (IsViewer(user)) return Results.Forbid();
    var logId = "wlog_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var createdAt = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        "INSERT INTO WorkLogs(id, taskId, userName, hours, description, createdAt) VALUES(@id,@taskId,@userName,@hours,@description,@createdAt)",
        P("@id", logId), P("@taskId", id), P("@userName", user.FullName), P("@hours", request.Hours),
        P("@description", request.Description), P("@createdAt", createdAt));
    await ExecuteAsync(conn, "UPDATE Tasks SET loggedHours = ISNULL(loggedHours,0) + @hours WHERE id=@taskId", P("@hours", request.Hours), P("@taskId", id));
    return Results.Created($"/api/tasks/{id}/worklogs/{logId}", new WorkLogClientDto(logId, user.FullName, request.Hours, request.Description, createdAt));
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

static UserDto CurrentUser(ClaimsPrincipal principal) => new(
    principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? "",
    principal.FindFirstValue(ClaimTypes.Name) ?? "",
    principal.FindFirstValue(ClaimTypes.Role) ?? "Member");

static bool IsManager(UserDto user) => user.Role is "Admin" or "Project Manager";
static bool IsViewer(UserDto user) => user.Role == "Viewer";
static List<string> SplitIds(string? ids) => string.IsNullOrWhiteSpace(ids) ? [] : ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

static async Task PublishTaskEventAsync(IHttpClientFactory factory, TaskEventRequest request)
{
    try
    {
        await factory.CreateClient("notify").PostAsJsonAsync("/api/internal/task-events", request);
    }
    catch
    {
        // Service must continue if notification service is temporarily down.
    }
}

static TaskDto ToDto(TaskRow row, List<SubTaskClientDto> subTasks, List<WorkLogClientDto> workLogs) => new(
    row.Id, row.Title, row.Description, row.Status, row.Priority, row.DueDate, row.ProjectId, row.AssigneeId,
    row.CreatorId, row.CreatedAt, string.IsNullOrWhiteSpace(row.Labels) ? [] : row.Labels.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
    subTasks, row.EstimatedHours, row.LoggedHours, workLogs, []);

static async Task EnsureSchemaAsync(SqlDb db)
{
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tasks' AND xtype='U')
        CREATE TABLE Tasks(
            id NVARCHAR(50) PRIMARY KEY,
            title NVARCHAR(255) NOT NULL,
            description NVARCHAR(MAX),
            status NVARCHAR(50),
            priority NVARCHAR(50),
            dueDate NVARCHAR(50),
            projectId NVARCHAR(50) NOT NULL,
            assigneeId NVARCHAR(500),
            creatorId NVARCHAR(50),
            createdAt NVARCHAR(50),
            labels NVARCHAR(500),
            estimatedHours FLOAT DEFAULT 0,
            loggedHours FLOAT DEFAULT 0
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubTasks' AND xtype='U')
        CREATE TABLE SubTasks(
            id NVARCHAR(50) PRIMARY KEY,
            taskId NVARCHAR(50) NOT NULL,
            title NVARCHAR(255) NOT NULL,
            isCompleted BIT DEFAULT 0
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkLogs' AND xtype='U')
        CREATE TABLE WorkLogs(
            id NVARCHAR(50) PRIMARY KEY,
            taskId NVARCHAR(50) NOT NULL,
            userName NVARCHAR(100),
            hours FLOAT DEFAULT 0,
            description NVARCHAR(MAX),
            createdAt NVARCHAR(50)
        );
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

static async Task<T?> QuerySingleAsync<T>(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    var list = await QueryAsync<T>(conn, sql, parameters);
    return list.FirstOrDefault();
}

static async Task ExecuteAsync(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddRange(parameters);
    await cmd.ExecuteNonQueryAsync();
}

static SqlParameter P(string name, object? value) => new(name, value ?? DBNull.Value);

static T Map<T>(IDataRecord row)
{
    object? Get(string name) => row[name] == DBNull.Value ? null : row[name];
    if (typeof(T) == typeof(TaskRow))
        return (T)(object)new TaskRow(Get("id")!.ToString()!, Get("title")!.ToString()!, Get("description")?.ToString() ?? "", Get("status")?.ToString() ?? "ToDo", Get("priority")?.ToString() ?? "Medium", Get("dueDate")?.ToString() ?? "", Get("projectId")?.ToString() ?? "", Get("assigneeId")?.ToString(), Get("creatorId")?.ToString() ?? "", Get("createdAt")?.ToString() ?? "", Get("labels")?.ToString() ?? "", Convert.ToDouble(Get("estimatedHours") ?? 0), Convert.ToDouble(Get("loggedHours") ?? 0));
    if (typeof(T) == typeof(SubTaskDto))
        return (T)(object)new SubTaskDto(Get("id")!.ToString()!, Get("taskId")!.ToString()!, Get("title")!.ToString()!, Convert.ToBoolean(Get("isCompleted") ?? false));
    if (typeof(T) == typeof(WorkLogDto))
        return (T)(object)new WorkLogDto(Get("id")!.ToString()!, Get("taskId")!.ToString()!, Get("userName")?.ToString() ?? "", Convert.ToDouble(Get("hours") ?? 0), Get("description")?.ToString() ?? "", Get("createdAt")?.ToString() ?? "");
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

record UserDto(string Id, string FullName, string Role);
record TaskCreateRequest(string Title, string Description, string Status, string Priority, string DueDate, string ProjectId, string? AssigneeId, string CreatorId, List<string>? Labels, double EstimatedHours);
record TaskUpdateRequest(string Id, string Title, string Description, string Status, string Priority, string DueDate, string ProjectId, string? AssigneeId, string CreatorId, List<string>? Labels, double EstimatedHours);
record StatusRequest(string Status);
record SubTaskRequest(string Title);
record WorkLogRequest(double Hours, string Description);
record TaskRow(string Id, string Title, string Description, string Status, string Priority, string DueDate, string ProjectId, string? AssigneeId, string CreatorId, string CreatedAt, string Labels, double EstimatedHours, double LoggedHours);
record TaskDto(string Id, string Title, string Description, string Status, string Priority, string DueDate, string ProjectId, string? AssigneeId, string CreatorId, string CreatedAt, List<string> Labels, List<SubTaskClientDto> SubTasks, double EstimatedHours, double LoggedHours, List<WorkLogClientDto> WorkLogs, List<object> Comments);
record SubTaskDto(string Id, string TaskId, string Title, bool IsCompleted);
record SubTaskClientDto(string Id, string Title, bool IsCompleted);
record WorkLogDto(string Id, string TaskId, string UserName, double Hours, string Description, string CreatedAt);
record WorkLogClientDto(string Id, string UserName, double Hours, string Description, string CreatedAt);
record TaskEventRequest(string Type, string Title, string Message, string? TaskId, string? ProjectId, List<string> RecipientUserIds, UserDto? Actor);
