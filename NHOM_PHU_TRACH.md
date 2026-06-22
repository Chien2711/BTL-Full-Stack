# Nhom 2 - Task & Kanban Service

Truong nhom: ngocbao72

Nhanh Git:

```text
nhom-2-ngocbao72
```

Service phu trach:

```text
TaskService
Port: 5002
Database: TaskDB
Swagger: http://localhost:5002/swagger
Health: http://localhost:5002/health
```

Chuc nang theo de:

```text
CRUD task: tieu de, mo ta, do uu tien, nhan mau, deadline
Kanban board: Backlog -> To Do -> In Progress -> Review -> Done
Sub-task
Gan nguoi phu trach
Log gio lam viec
Publish event task.status.changed / task.assigned sang NotifyService
```

Lenh chay tren may nhom 2:

```powershell
.\scripts\open-radmin-firewall.ps1
docker compose -f docker-compose.group2.yml up -d --build
```

Hoac dung script chung:

```powershell
.\scripts\start-group-service.ps1 -Service task
```

TaskService can goi NotifyService cua nhom 3:

```text
NOTIFY_SERVICE_URL=http://26.251.111.241:5003
```

Sau khi chay, bao IP Radmin cua nhom 2 cho nhom 3 de cap nhat:

```text
TaskService.Host = 26.126.20.22
TaskService.Port = 5002
```

May nhom 3/server kiem tra:

```powershell
Invoke-RestMethod http://26.126.20.22:5002/health
```
