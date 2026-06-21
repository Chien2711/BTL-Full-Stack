# ProjectHub Microservices Demo

## Ports

- API Gateway: `http://localhost:7000`
- Project Service: `http://localhost:5001/swagger`
- Task Service: `http://localhost:5002/swagger`
- Notify/Auth/Comment Service: `http://localhost:5003/swagger`
- Frontend Vue: `http://127.0.0.1:5173`

## SQL Server databases

Direct `dotnet run` uses local SQL Server `.\SQLEXPRESS` and creates:

- `ProjectDB`
- `TaskDB`
- `NotifyDB`

The old `ProjectManagement` database belongs to the legacy backend and is not the microservice database set.

## Demo accounts

- Admin: `admin@projecthub.com` / `admin123`
- Member: `nhanvien1@projecthub.com` / `123456`
- Viewer: `viewer@projecthub.com` / `123456`

## F12 Network checklist

Open `http://127.0.0.1:5173`, press F12, then login as admin.

Expected Gateway calls:

- `POST http://localhost:7000/api/auth/login` -> Notify/Auth Service
- `GET http://localhost:7000/api/users` -> Notify/Auth Service
- `GET http://localhost:7000/api/projects` -> Project Service
- `GET http://localhost:7000/api/tasks` -> Task Service
- `GET http://localhost:7000/api/notifications?status=all` -> Notify Service

Submitting a comment in Task Detail calls:

- `POST /api/tasks/{taskId}/comments` -> Notify Service
- `GET /api/projects` -> Project Service
- `GET /api/tasks` -> Task Service
- `GET /api/tasks/{taskId}/comments` and `GET /api/notifications` -> Notify Service

## Docker

Build images:

```powershell
docker compose -f docker-compose.microservices.yml build
```

Run the full container stack, including SQL Server container:

```powershell
docker compose -f docker-compose.microservices.yml up -d
```

The container SQL Server is exposed on `localhost,14333`.
