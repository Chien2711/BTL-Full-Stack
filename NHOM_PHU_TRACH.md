# Nhom 3 - Comment & Notify Service

Truong nhom: Tuanhimmnz

Nhanh Git:

```text
nhom-3-tuanhimmnz
```

Service phu trach:

```text
NotifyService
Port: 5003
Database: NotifyDB
Swagger: http://localhost:5003/swagger
Health: http://localhost:5003/health
```

Thanh phan chay tren may nhom 3/server:

```text
NotifyService   - Comment, notification, auth/user
ApiGateway      - Ocelot Gateway, validate JWT, route sang 3 nhom
Frontend        - Vue 3 build bang Nginx
SQL Server      - NotifyDB cua nhom 3
```

Chuc nang theo de:

```text
JWT login va quan ly tai khoan nguoi dung
CRUD comment theo task
Activity log tu dong
Consume event tu TaskService de tao notification
Danh sach notification
Danh dau da doc / danh dau tat ca da doc
```

Lenh chay tren may nhom 3/server:

```powershell
.\scripts\open-radmin-firewall.ps1
docker compose -f docker-compose.group3.yml up -d --build
```

Hoac dung script chung:

```powershell
.\scripts\start-group-service.ps1 -Service notify
.\scripts\start-group-service.ps1 -Service gateway
```

Frontend cho ca 3 nhom:

```text
http://26.251.111.241:8080
```

Gateway chung:

```text
http://26.251.111.241:7000
```

Kiem tra ket noi 3 nhom:

```powershell
.\scripts\check-radmin-services.ps1 -SkipGatewayRouteTest
```

Khi nhom 1 va nhom 2 da bat service, chay:

```powershell
.\scripts\check-radmin-services.ps1
```
