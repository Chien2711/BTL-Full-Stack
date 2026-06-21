using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "ProjectHub.Shared.Secret.Key.For.Student.Microservices.2026!";
var issuer = builder.Configuration["Jwt:Issuer"] ?? "ProjectHub";
var audience = builder.Configuration["Jwt:Audience"] ?? "ProjectHub.Client";

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = TokenValidation(jwtSecret, issuer, audience);
    });
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();

var db = new SqlDb(app.Configuration.GetConnectionString("NotifyDb")!);
await db.EnsureDatabaseAsync("NotifyDB");
await EnsureSchemaAsync(db);
await SeedUsersAsync(db);

app.MapGet("/health", () => Results.Ok(new { service = "NotifyService", status = "ok" }));

app.MapPost("/api/auth/login", async (LoginRequest request) =>
{
    await using var conn = await db.OpenAsync();
    var user = await QuerySingleAsync<UserDto>(conn,
        "SELECT id, fullName, avatarUrl, role, isOnline, email FROM Users WHERE email=@email AND password=@password",
        P("@email", request.Email), P("@password", request.Password));

    if (user is null)
    {
        return Results.Unauthorized();
    }

    var token = CreateToken(user, jwtSecret, issuer, audience);
    return Results.Ok(new { user, token });
});

app.MapPost("/api/auth/register", async (RegisterRequest request) =>
{
    var id = "u_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var avatarUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(request.FullName)}&background=6366f1&color=fff";
    var role = string.IsNullOrWhiteSpace(request.Role) ? "Member" : request.Role;

    await using var conn = await db.OpenAsync();
    var existing = await ExecuteScalarAsync<int>(conn, "SELECT COUNT(1) FROM Users WHERE email=@email", P("@email", request.Email));
    if (existing > 0)
    {
        return Results.BadRequest(new { error = "Email này đã được sử dụng" });
    }

    await ExecuteAsync(conn,
        """
        INSERT INTO Users(id, fullName, avatarUrl, role, isOnline, email, password)
        VALUES(@id, @fullName, @avatarUrl, @role, 1, @email, @password)
        """,
        P("@id", id), P("@fullName", request.FullName), P("@avatarUrl", avatarUrl),
        P("@role", role), P("@email", request.Email), P("@password", request.Password));

    var user = new UserDto(id, request.FullName, avatarUrl, role, true, request.Email);
    var token = CreateToken(user, jwtSecret, issuer, audience);
    return Results.Created("/api/users/me", new { user, token });
});

app.MapGet("/api/users", async () =>
{
    await using var conn = await db.OpenAsync();
    var users = await QueryAsync<UserDto>(conn, "SELECT id, fullName, avatarUrl, role, CAST(isOnline AS bit) AS isOnline, email FROM Users ORDER BY fullName");
    return Results.Ok(users);
});

app.MapGet("/api/users/me", async (ClaimsPrincipal principal) =>
{
    var tokenUser = CurrentUser(principal);
    if (tokenUser is null) return Results.Unauthorized();

    await using var conn = await db.OpenAsync();
    var dto = await QuerySingleAsync<UserDto>(conn,
        "SELECT id, fullName, avatarUrl, role, CAST(isOnline AS bit) AS isOnline, email FROM Users WHERE id=@id",
        P("@id", tokenUser.Id));
    return dto is null ? Results.Unauthorized() : Results.Ok(dto);
}).RequireAuthorization();

app.MapPut("/api/users/me", async (ProfileUpdateRequest request, ClaimsPrincipal principal) =>
{
    var tokenUser = CurrentUser(principal);
    if (tokenUser is null) return Results.Unauthorized();

    var fullName = (request.FullName ?? "").Trim();
    if (fullName.Length < 2) return Results.BadRequest(new { error = "Họ tên phải có ít nhất 2 ký tự" });

    var avatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl)
        ? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(fullName)}&background=0f766e&color=fff"
        : request.AvatarUrl.Trim();

    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        "UPDATE Users SET fullName=@fullName, avatarUrl=@avatarUrl WHERE id=@id",
        P("@fullName", fullName), P("@avatarUrl", avatarUrl), P("@id", tokenUser.Id));

    var updated = await QuerySingleAsync<UserDto>(conn,
        "SELECT id, fullName, avatarUrl, role, CAST(isOnline AS bit) AS isOnline, email FROM Users WHERE id=@id",
        P("@id", tokenUser.Id));
    if (updated is null) return Results.NotFound();

    await LogAsync(conn, updated, "user.profile.updated", "user", updated.Id, null, $"{updated.FullName} cập nhật hồ sơ cá nhân");
    var token = CreateToken(updated, jwtSecret, issuer, audience);
    return Results.Ok(new { user = updated, token });
}).RequireAuthorization();

app.MapPut("/api/users/me/password", async (PasswordUpdateRequest request, ClaimsPrincipal principal) =>
{
    var tokenUser = CurrentUser(principal);
    if (tokenUser is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
    {
        return Results.BadRequest(new { error = "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    await using var conn = await db.OpenAsync();
    var matched = await ExecuteScalarAsync<int>(conn,
        "SELECT COUNT(1) FROM Users WHERE id=@id AND password=@currentPassword",
        P("@id", tokenUser.Id), P("@currentPassword", request.CurrentPassword));
    if (matched == 0) return Results.BadRequest(new { error = "Mật khẩu hiện tại không đúng" });

    await ExecuteAsync(conn, "UPDATE Users SET password=@password WHERE id=@id",
        P("@password", request.NewPassword), P("@id", tokenUser.Id));
    await LogAsync(conn, tokenUser, "user.password.changed", "user", tokenUser.Id, null, $"{tokenUser.FullName} đổi mật khẩu");
    return Results.Ok(new { message = "Đổi mật khẩu thành công" });
}).RequireAuthorization();

app.MapPut("/api/users/{id}/role", async (string id, RoleUpdateRequest request, ClaimsPrincipal principal) =>
{
    var actor = CurrentUser(principal);
    if (actor is null) return Results.Unauthorized();
    if (!IsManager(actor)) return Results.Forbid();

    var allowedRoles = new[] { "Admin", "Project Manager", "Member", "Developer", "Viewer" };
    var role = (request.Role ?? "").Trim();
    if (!allowedRoles.Contains(role)) return Results.BadRequest(new { error = "Vai trò không hợp lệ" });

    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "UPDATE Users SET role=@role WHERE id=@id", P("@role", role), P("@id", id));
    var updated = await QuerySingleAsync<UserDto>(conn,
        "SELECT id, fullName, avatarUrl, role, CAST(isOnline AS bit) AS isOnline, email FROM Users WHERE id=@id",
        P("@id", id));
    if (updated is null) return Results.NotFound();

    await LogAsync(conn, actor, "user.role.updated", "user", id, null, $"{actor.FullName} đổi vai trò {updated.FullName} thành {role}");
    return Results.Ok(updated);
}).RequireAuthorization();

app.MapGet("/api/tasks/{taskId}/comments", async (string taskId) =>
{
    await using var conn = await db.OpenAsync();
    var comments = await QueryAsync<CommentDto>(conn,
        "SELECT id, taskId, userId, userName, userAvatar, content, createdAt, updatedAt FROM Comments WHERE taskId=@taskId ORDER BY createdAt",
        P("@taskId", taskId));
    return Results.Ok(comments);
}).RequireAuthorization();

app.MapPost("/api/tasks/{taskId}/comments", async (string taskId, CommentRequest request, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    if (IsViewer(user)) return Results.Forbid();

    var content = (request.Content ?? "").Trim();
    if (content.Length == 0) return Results.BadRequest(new { error = "Nội dung bình luận không được để trống" });

    var id = "c_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    var now = DateTimeOffset.UtcNow.ToString("O");
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        INSERT INTO Comments(id, taskId, userId, userName, userAvatar, content, createdAt, updatedAt)
        VALUES(@id, @taskId, @userId, @userName, @userAvatar, @content, @createdAt, NULL)
        """,
        P("@id", id), P("@taskId", taskId), P("@userId", user.Id),
        P("@userName", user.FullName), P("@userAvatar", user.AvatarUrl),
        P("@content", content), P("@createdAt", now));

    await LogAsync(conn, user, "comment.created", "comment", id, taskId, $"{user.FullName} đã bình luận task {taskId}");
    var recipients = await QueryAsync<string>(conn,
        """
        SELECT DISTINCT userId FROM Comments WHERE taskId=@taskId
        UNION
        SELECT id FROM Users WHERE role IN ('Admin', 'Project Manager')
        """,
        P("@taskId", taskId));
    foreach (var recipient in recipients.Where(r => r != user.Id))
    {
        await InsertNotificationAsync(conn, recipient, "Bình luận mới", $"{user.FullName} đã bình luận trong task {taskId}.", "comment.created", taskId, null, user);
    }

    return Results.Created($"/api/tasks/{taskId}/comments/{id}", new CommentDto(id, taskId, user.Id, user.FullName, user.AvatarUrl, content, now, null));
}).RequireAuthorization();

app.MapPut("/api/tasks/{taskId}/comments/{commentId}", async (string taskId, string commentId, CommentRequest request, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    if (IsViewer(user)) return Results.Forbid();

    var content = (request.Content ?? "").Trim();
    if (content.Length == 0) return Results.BadRequest(new { error = "Nội dung bình luận không được để trống" });

    await using var conn = await db.OpenAsync();
    var comment = await QuerySingleAsync<CommentDto>(conn,
        "SELECT id, taskId, userId, userName, userAvatar, content, createdAt, updatedAt FROM Comments WHERE id=@id AND taskId=@taskId",
        P("@id", commentId), P("@taskId", taskId));
    if (comment is null) return Results.NotFound();
    if (!IsManager(user) && comment.UserId != user.Id) return Results.Forbid();

    var updatedAt = DateTimeOffset.UtcNow.ToString("O");
    await ExecuteAsync(conn, "UPDATE Comments SET content=@content, updatedAt=@updatedAt WHERE id=@id",
        P("@content", content), P("@updatedAt", updatedAt), P("@id", commentId));
    await LogAsync(conn, user, "comment.updated", "comment", commentId, taskId, $"{user.FullName} đã sửa bình luận {commentId}");
    return Results.Ok(comment with { Content = content, UpdatedAt = updatedAt });
}).RequireAuthorization();

app.MapDelete("/api/tasks/{taskId}/comments/{commentId}", async (string taskId, string commentId, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    if (IsViewer(user)) return Results.Forbid();

    await using var conn = await db.OpenAsync();
    var comment = await QuerySingleAsync<CommentDto>(conn,
        "SELECT id, taskId, userId, userName, userAvatar, content, createdAt, updatedAt FROM Comments WHERE id=@id AND taskId=@taskId",
        P("@id", commentId), P("@taskId", taskId));
    if (comment is null) return Results.NotFound();
    if (!IsManager(user) && comment.UserId != user.Id) return Results.Forbid();

    await ExecuteAsync(conn, "DELETE FROM Comments WHERE id=@id", P("@id", commentId));
    await LogAsync(conn, user, "comment.deleted", "comment", commentId, taskId, $"{user.FullName} đã xóa bình luận {commentId}");
    return Results.Ok(new { id = commentId });
}).RequireAuthorization();

app.MapGet("/api/notifications", async (ClaimsPrincipal principal, string status = "all") =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();

    var where = status == "unread" ? "AND isRead=0" : status == "read" ? "AND isRead=1" : "";
    await using var conn = await db.OpenAsync();
    var notifications = await QueryAsync<NotificationDto>(conn,
        $"""
        SELECT id, userId, title, message, type, taskId, projectId, actorId, actorName, CAST(isRead AS bit) AS isRead, createdAt
        FROM Notifications WHERE userId=@userId {where} ORDER BY createdAt DESC
        """,
        P("@userId", user.Id));
    return Results.Ok(notifications);
}).RequireAuthorization();

app.MapGet("/api/notifications/unread-count", async (ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    await using var conn = await db.OpenAsync();
    var count = await ExecuteScalarAsync<int>(conn, "SELECT COUNT(1) FROM Notifications WHERE userId=@userId AND isRead=0", P("@userId", user.Id));
    return Results.Ok(new { count });
}).RequireAuthorization();

app.MapPost("/api/notifications", async (NotificationCreateRequest request, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    if (!IsManager(user) && request.UserId != user.Id) return Results.Forbid();

    await using var conn = await db.OpenAsync();
    var notification = await InsertNotificationAsync(conn, request.UserId, request.Title, request.Message, request.Type, request.TaskId, request.ProjectId, user);
    await LogAsync(conn, user, "notification.created", "notification", notification.Id, request.TaskId, $"{user.FullName} đã tạo thông báo {notification.Title}");
    return Results.Created($"/api/notifications/{notification.Id}", notification);
}).RequireAuthorization();

app.MapPost("/api/internal/task-events", async (TaskEventRequest request) =>
{
    await using var conn = await db.OpenAsync();
    foreach (var userId in request.RecipientUserIds.Distinct().Where(id => !string.IsNullOrWhiteSpace(id)))
    {
        await InsertNotificationAsync(conn, userId, request.Title, request.Message, request.Type, request.TaskId, request.ProjectId, request.Actor);
    }
    return Results.Accepted();
});

app.MapPatch("/api/notifications/mark-all-read", async (ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "UPDATE Notifications SET isRead=1 WHERE userId=@userId", P("@userId", user.Id));
    return Results.Ok();
}).RequireAuthorization();

app.MapPatch("/api/notifications/{id}/read", async (string id, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "UPDATE Notifications SET isRead=1 WHERE id=@id AND userId=@userId", P("@id", id), P("@userId", user.Id));
    var notification = await QuerySingleAsync<NotificationDto>(conn,
        "SELECT id, userId, title, message, type, taskId, projectId, actorId, actorName, CAST(isRead AS bit) AS isRead, createdAt FROM Notifications WHERE id=@id AND userId=@userId",
        P("@id", id), P("@userId", user.Id));
    return notification is null ? Results.NotFound() : Results.Ok(notification);
}).RequireAuthorization();

app.MapDelete("/api/notifications/{id}", async (string id, ClaimsPrincipal principal) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn, "DELETE FROM Notifications WHERE id=@id AND userId=@userId", P("@id", id), P("@userId", user.Id));
    return Results.Ok(new { id });
}).RequireAuthorization();

app.MapGet("/api/activity-logs", async (ClaimsPrincipal principal, string? taskId) =>
{
    var user = CurrentUser(principal);
    if (user is null) return Results.Unauthorized();
    if (!string.IsNullOrWhiteSpace(taskId))
    {
        await using var conn = await db.OpenAsync();
        var logs = await QueryAsync<ActivityLogDto>(conn,
            "SELECT TOP 100 id, userId, userName, action, entityType, entityId, taskId, message, createdAt FROM ActivityLogs WHERE taskId=@taskId ORDER BY createdAt DESC",
            P("@taskId", taskId));
        return Results.Ok(logs);
    }
    if (!IsManager(user)) return Results.Forbid();
    await using (var connAll = await db.OpenAsync())
    {
        var logs = await QueryAsync<ActivityLogDto>(connAll,
            "SELECT TOP 100 id, userId, userName, action, entityType, entityId, taskId, message, createdAt FROM ActivityLogs ORDER BY createdAt DESC");
        return Results.Ok(logs);
    }
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

static string CreateToken(UserDto user, string secret, string issuer, string audience)
{
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id),
        new Claim(ClaimTypes.Name, user.FullName),
        new Claim(ClaimTypes.Role, user.Role),
        new Claim("avatarUrl", user.AvatarUrl),
        new Claim("email", user.Email)
    };
    var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(issuer, audience, claims, expires: DateTime.UtcNow.AddHours(8), signingCredentials: credentials);
    return new JwtSecurityTokenHandler().WriteToken(token);
}

static UserDto? CurrentUser(ClaimsPrincipal principal)
{
    if (principal.Identity?.IsAuthenticated != true) return null;
    var id = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
    return new UserDto(
        id,
        principal.FindFirstValue(ClaimTypes.Name) ?? id,
        principal.FindFirstValue("avatarUrl") ?? "",
        principal.FindFirstValue(ClaimTypes.Role) ?? "Member",
        true,
        principal.FindFirstValue("email") ?? "");
}

static bool IsManager(UserDto user) => user.Role is "Admin" or "Project Manager";
static bool IsViewer(UserDto user) => user.Role == "Viewer";

static async Task EnsureSchemaAsync(SqlDb db)
{
    await using var conn = await db.OpenAsync();
    await ExecuteAsync(conn,
        """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
        CREATE TABLE Users(
            id NVARCHAR(50) PRIMARY KEY,
            fullName NVARCHAR(100) NOT NULL,
            avatarUrl NVARCHAR(500),
            role NVARCHAR(50),
            isOnline BIT DEFAULT 0,
            email NVARCHAR(100) UNIQUE NOT NULL,
            password NVARCHAR(100) NOT NULL
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comments' AND xtype='U')
        CREATE TABLE Comments(
            id NVARCHAR(50) PRIMARY KEY,
            taskId NVARCHAR(50) NOT NULL,
            userId NVARCHAR(50),
            userName NVARCHAR(100),
            userAvatar NVARCHAR(500),
            content NVARCHAR(MAX),
            createdAt NVARCHAR(100),
            updatedAt NVARCHAR(100)
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
        CREATE TABLE Notifications(
            id NVARCHAR(50) PRIMARY KEY,
            userId NVARCHAR(50) NOT NULL,
            title NVARCHAR(255) NOT NULL,
            message NVARCHAR(MAX),
            type NVARCHAR(80),
            taskId NVARCHAR(50),
            projectId NVARCHAR(50),
            actorId NVARCHAR(50),
            actorName NVARCHAR(100),
            isRead BIT DEFAULT 0,
            createdAt NVARCHAR(100)
        );
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLogs' AND xtype='U')
        CREATE TABLE ActivityLogs(
            id NVARCHAR(50) PRIMARY KEY,
            userId NVARCHAR(50),
            userName NVARCHAR(100),
            action NVARCHAR(100) NOT NULL,
            entityType NVARCHAR(50),
            entityId NVARCHAR(50),
            taskId NVARCHAR(50),
            message NVARCHAR(MAX),
            createdAt NVARCHAR(100)
        );
        """);
}

static async Task SeedUsersAsync(SqlDb db)
{
    await using var conn = await db.OpenAsync();
    var count = await ExecuteScalarAsync<int>(conn, "SELECT COUNT(1) FROM Users");
    if (count > 0) return;

    var users = new[]
    {
        new UserSeed("u0", "Quản trị viên", "Admin", "admin@projecthub.com", "admin123", "https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff"),
        new UserSeed("u10", "Nguyễn Văn A", "Backend Dev", "nhanvien1@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Nguyen+Van+A&background=10b981&color=fff"),
        new UserSeed("u11", "Trần Thị B", "Frontend Lead", "nhanvien2@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Tran+Thi+B&background=6366f1&color=fff"),
        new UserSeed("u12", "Lê Văn C", "UI/UX Designer", "nhanvien3@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Le+Van+C&background=ec4899&color=fff"),
        new UserSeed("u13", "Phạm Thị D", "QA Engineer", "nhanvien4@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Pham+Thi+D&background=f59e0b&color=fff"),
        new UserSeed("u14", "Hoàng Văn E", "Business Analyst", "nhanvien5@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Hoang+Van+E&background=8b5cf6&color=fff"),
        new UserSeed("u_viewer", "Viewer Demo", "Viewer", "viewer@projecthub.com", "123456", "https://ui-avatars.com/api/?name=Viewer&background=64748b&color=fff")
    };

    foreach (var user in users)
    {
        await ExecuteAsync(conn,
            "INSERT INTO Users(id, fullName, avatarUrl, role, isOnline, email, password) VALUES(@id,@fullName,@avatarUrl,@role,1,@email,@password)",
            P("@id", user.Id), P("@fullName", user.FullName), P("@avatarUrl", user.AvatarUrl),
            P("@role", user.Role), P("@email", user.Email), P("@password", user.Password));
    }
}

static async Task<NotificationDto> InsertNotificationAsync(SqlConnection conn, string userId, string title, string? message, string? type, string? taskId, string? projectId, UserDto? actor)
{
    var id = "noti_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + "_" + Guid.NewGuid().ToString("N")[..6];
    var createdAt = DateTimeOffset.UtcNow.ToString("O");
    await ExecuteAsync(conn,
        """
        INSERT INTO Notifications(id, userId, title, message, type, taskId, projectId, actorId, actorName, isRead, createdAt)
        VALUES(@id,@userId,@title,@message,@type,@taskId,@projectId,@actorId,@actorName,0,@createdAt)
        """,
        P("@id", id), P("@userId", userId), P("@title", title),
        P("@message", (object?)message ?? DBNull.Value), P("@type", (object?)type ?? "manual"),
        P("@taskId", (object?)taskId ?? DBNull.Value), P("@projectId", (object?)projectId ?? DBNull.Value),
        P("@actorId", (object?)actor?.Id ?? DBNull.Value), P("@actorName", (object?)actor?.FullName ?? DBNull.Value),
        P("@createdAt", createdAt));
    return new NotificationDto(id, userId, title, message ?? "", type ?? "manual", taskId, projectId, actor?.Id, actor?.FullName, false, createdAt);
}

static Task LogAsync(SqlConnection conn, UserDto user, string action, string entityType, string entityId, string? taskId, string message)
{
    return ExecuteAsync(conn,
        """
        INSERT INTO ActivityLogs(id, userId, userName, action, entityType, entityId, taskId, message, createdAt)
        VALUES(@id,@userId,@userName,@action,@entityType,@entityId,@taskId,@message,@createdAt)
        """,
        P("@id", "act_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + "_" + Guid.NewGuid().ToString("N")[..6]),
        P("@userId", user.Id), P("@userName", user.FullName), P("@action", action),
        P("@entityType", entityType), P("@entityId", entityId), P("@taskId", (object?)taskId ?? DBNull.Value),
        P("@message", message), P("@createdAt", DateTimeOffset.UtcNow.ToString("O")));
}

static async Task<List<T>> QueryAsync<T>(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddRange(parameters);
    await using var reader = await cmd.ExecuteReaderAsync();
    var list = new List<T>();
    while (await reader.ReadAsync())
    {
        list.Add(Map<T>(reader));
    }
    return list;
}

static async Task<T?> QuerySingleAsync<T>(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    var list = await QueryAsync<T>(conn, sql, parameters);
    return list.FirstOrDefault();
}

static async Task<T> ExecuteScalarAsync<T>(SqlConnection conn, string sql, params SqlParameter[] parameters)
{
    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddRange(parameters);
    var value = await cmd.ExecuteScalarAsync();
    return (T)Convert.ChangeType(value!, typeof(T));
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
    if (typeof(T) == typeof(string)) return (T)(object)(Get(row.GetName(0))?.ToString() ?? "");
    if (typeof(T) == typeof(UserDto)) return (T)(object)new UserDto(Get("id")!.ToString()!, Get("fullName")!.ToString()!, Get("avatarUrl")?.ToString() ?? "", Get("role")?.ToString() ?? "Member", Convert.ToBoolean(Get("isOnline") ?? false), Get("email")?.ToString() ?? "");
    if (typeof(T) == typeof(CommentDto)) return (T)(object)new CommentDto(Get("id")!.ToString()!, Get("taskId")!.ToString()!, Get("userId")?.ToString(), Get("userName")?.ToString() ?? "", Get("userAvatar")?.ToString() ?? "", Get("content")?.ToString() ?? "", Get("createdAt")?.ToString() ?? "", Get("updatedAt")?.ToString());
    if (typeof(T) == typeof(NotificationDto)) return (T)(object)new NotificationDto(Get("id")!.ToString()!, Get("userId")!.ToString()!, Get("title")?.ToString() ?? "", Get("message")?.ToString() ?? "", Get("type")?.ToString() ?? "", Get("taskId")?.ToString(), Get("projectId")?.ToString(), Get("actorId")?.ToString(), Get("actorName")?.ToString(), Convert.ToBoolean(Get("isRead") ?? false), Get("createdAt")?.ToString() ?? "");
    if (typeof(T) == typeof(ActivityLogDto)) return (T)(object)new ActivityLogDto(Get("id")!.ToString()!, Get("userId")?.ToString(), Get("userName")?.ToString(), Get("action")?.ToString() ?? "", Get("entityType")?.ToString(), Get("entityId")?.ToString(), Get("taskId")?.ToString(), Get("message")?.ToString(), Get("createdAt")?.ToString() ?? "");
    throw new NotSupportedException(typeof(T).Name);
}

sealed class SqlDb(string connectionString)
{
    public async Task EnsureDatabaseAsync(string databaseName)
    {
        var master = ReplaceDatabase(connectionString, "master");
        await using var conn = new SqlConnection(master);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand($"IF DB_ID(N'{databaseName.Replace("'", "''")}') IS NULL CREATE DATABASE [{databaseName}]", conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<SqlConnection> OpenAsync()
    {
        var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        return conn;
    }

    static string ReplaceDatabase(string cs, string database)
    {
        var builder = new SqlConnectionStringBuilder(cs) { InitialCatalog = database };
        return builder.ConnectionString;
    }
}

record LoginRequest(string Email, string Password);
record RegisterRequest(string FullName, string Email, string Password, string? Role);
record ProfileUpdateRequest(string? FullName, string? AvatarUrl);
record PasswordUpdateRequest(string CurrentPassword, string NewPassword);
record RoleUpdateRequest(string? Role);
record CommentRequest(string? Content);
record NotificationCreateRequest(string UserId, string Title, string? Message, string? Type, string? TaskId, string? ProjectId);
record TaskEventRequest(string Type, string Title, string Message, string? TaskId, string? ProjectId, List<string> RecipientUserIds, UserDto? Actor);
record UserSeed(string Id, string FullName, string Role, string Email, string Password, string AvatarUrl);
record UserDto(string Id, string FullName, string AvatarUrl, string Role, bool IsOnline, string Email);
record CommentDto(string Id, string TaskId, string? UserId, string UserName, string UserAvatar, string Content, string CreatedAt, string? UpdatedAt);
record NotificationDto(string Id, string UserId, string Title, string Message, string Type, string? TaskId, string? ProjectId, string? ActorId, string? ActorName, bool IsRead, string CreatedAt);
record ActivityLogDto(string Id, string? UserId, string? UserName, string Action, string? EntityType, string? EntityId, string? TaskId, string? Message, string CreatedAt);
