# Nhom 1 - Project & Member Service

Truong nhom: Chien2711

Nhanh Git:

```text
nhom-1-chien2711
```

Service phu trach:

```text
ProjectService
Port: 5001
Database: ProjectDB
Swagger: http://localhost:5001/swagger
Health: http://localhost:5001/health
```

Chuc nang theo de:

```text
Tao du an: ten, mo ta, ngay bat dau/ket thuc, mau nhan dien
Quan ly thanh vien: Owner / Manager / Member / Viewer
Tao sprint voi muc tieu va thoi gian chay
Publish event project.member.added / sprint.started neu can tich hop message
```

Lenh chay tren may nhom 1:

```powershell
.\scripts\open-radmin-firewall.ps1
docker compose -f docker-compose.group1.yml up -d --build
```

Hoac dung script chung:

```powershell
.\scripts\start-group-service.ps1 -Service project
```

Sau khi chay, bao IP Radmin cua nhom 1 cho nhom 3 de cap nhat:

```text
ProjectService.Host = 26.43.9.197
ProjectService.Port = 5001
```

May nhom 3/server kiem tra:

```powershell
Invoke-RestMethod http://26.43.9.197:5001/health
```
