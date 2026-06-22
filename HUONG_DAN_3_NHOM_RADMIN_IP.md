# Huong Dan 3 Nhom Chay Rieng Service Qua Radmin VPN

Muc tieu: moi nhom chay service rieng tren may rieng, nhung van dung chung server nhom 3 de chay API Gateway va Frontend. Thay check F12 tren Vue thi request phai di ve Gateway, Gateway moi route sang tung service cua 3 nhom.

## 1. So do IP hien tai

```text
Nhom 3 / server chung:
IP Radmin: 26.251.111.241
Chay: notify-service, api-gateway, frontend

Nhom 2:
IP Radmin: 26.126.20.22
Chay: task-service

Nhom 1:
IP Radmin: 26.43.9.197
Chay: project-service
```

Frontend dung chung:

```text
http://26.251.111.241:8080
```

API Gateway dung chung:

```text
http://26.251.111.241:7000
```

## 2. File cau hinh IP

File can sua khi doi IP:

```text
deployment/radmin-services.json
```

Noi dung dung voi IP hien tai:

```json
{
  "GatewayPublicBaseUrl": "http://26.251.111.241:7000",
  "Services": {
    "ProjectService": {
      "Name": "Nhom 1 - Project & Member Service",
      "Host": "26.43.9.197",
      "Port": 5001
    },
    "TaskService": {
      "Name": "Nhom 2 - Task & Kanban Service",
      "Host": "26.126.20.22",
      "Port": 5002
    },
    "NotifyService": {
      "Name": "Nhom 3 - Comment & Notify Service",
      "Host": "26.251.111.241",
      "Port": 5003
    }
  }
}
```

Gateway se route:

```text
/api/projects                         -> nhom 1, 26.43.9.197:5001
/api/tasks                            -> nhom 2, 26.126.20.22:5002
/api/auth, /api/users                 -> nhom 3, 26.251.111.241:5003
/api/notifications, /api/activity-logs -> nhom 3, 26.251.111.241:5003
/api/tasks/{id}/comments              -> nhom 3, 26.251.111.241:5003
```

## 3. Cap nhat IP bang script

Chay tren may nhom 3/server chung:

```powershell
.\scripts\set-radmin-ips.ps1 `
  -GatewayHost 26.251.111.241 `
  -ProjectHost 26.43.9.197 `
  -TaskHost 26.126.20.22 `
  -NotifyHost 26.251.111.241
```

Sau khi doi IP, restart Gateway va Frontend:

```powershell
docker compose -f docker-compose.microservices.yml up -d --build api-gateway frontend
```

## 4. Lenh chay cho nhom 1

Nhom 1 chay Project & Member Service tai IP `26.43.9.197`.

```powershell
cd ProjectHub
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service project
```

Kiem tra tren may nhom 1:

```text
http://localhost:5001/health
http://localhost:5001/swagger
```

Kiem tra tu may nhom 3/server:

```powershell
Invoke-RestMethod http://26.43.9.197:5001/health
```

## 5. Lenh chay cho nhom 2

Nhom 2 chay Task & Kanban Service tai IP `26.126.20.22`.

Tren may nhom 2, dam bao `deployment/radmin-services.json` co NotifyService la IP nhom 3:

```json
"NotifyService": {
  "Host": "26.251.111.241",
  "Port": 5003
}
```

Sau do chay:

```powershell
cd ProjectHub
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service task
```

Kiem tra tren may nhom 2:

```text
http://localhost:5002/health
http://localhost:5002/swagger
```

Kiem tra tu may nhom 3/server:

```powershell
Invoke-RestMethod http://26.126.20.22:5002/health
```

Task Service se tao notification qua:

```text
http://26.251.111.241:5003/api/internal/task-events
```

## 6. Lenh chay cho nhom 3/server

Nhom 3 chay Comment & Notify Service, API Gateway va Frontend tai IP `26.251.111.241`.

```powershell
cd ProjectHub
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service notify
.\scripts\start-group-service.ps1 -Service gateway
```

Kiem tra tren may nhom 3/server:

```text
http://localhost:5003/health
http://localhost:5003/swagger
http://localhost:7000/health
http://localhost:8080
```

May cac nhom khac truy cap frontend bang:

```text
http://26.251.111.241:8080
```

## 7. Tool check 3 server da ket noi chua

Chay tren may nhom 3/server:

```powershell
.\scripts\check-radmin-services.ps1 -SkipGatewayRouteTest
```

Lenh nay check:

```text
Nhom 1 Project Service: http://26.43.9.197:5001/health
Nhom 2 Task Service:    http://26.126.20.22:5002/health
Nhom 3 Notify Service:  http://26.251.111.241:5003/health
API Gateway:            http://26.251.111.241:7000/health
Frontend:               26.251.111.241:8080
```

Khi ca 3 service deu OK, chay full test qua Gateway:

```powershell
.\scripts\check-radmin-services.ps1
```

Full test se login qua Gateway va goi:

```text
POST /api/auth/login
GET  /api/projects
GET  /api/tasks
GET  /api/notifications
```

## 8. Cach xem thuc te khi thay check F12

Mo frontend:

```text
http://26.251.111.241:8080
```

Mo DevTools/F12, tab Network. Khi bam chuc nang tren Vue, request phai di ve:

```text
http://26.251.111.241:7000/api/...
```

Khong goi truc tiep:

```text
http://26.43.9.197:5001/...
http://26.126.20.22:5002/...
http://26.251.111.241:5003/...
```

Vi frontend chi duoc goi API Gateway, khong goi thang service.

## 9. Loi thuong gap

Neu Project Service fail:

```text
Kiem tra may nhom 1 co chay start-group-service -Service project chua.
Kiem tra Radmin IP dung la 26.43.9.197.
Kiem tra firewall da mo port 5001.
```

Neu Task Service fail:

```text
Kiem tra may nhom 2 co chay start-group-service -Service task chua.
Kiem tra Radmin IP dung la 26.126.20.22.
Kiem tra firewall da mo port 5002.
```

Neu Notify/Gateway/Frontend fail:

```text
Kiem tra may nhom 3/server co chay notify va gateway chua.
Kiem tra Radmin IP dung la 26.251.111.241.
Kiem tra firewall da mo port 5003, 7000, 8080.
```

Neu da sua IP nhung Gateway van route sai:

```powershell
docker compose -f docker-compose.microservices.yml up -d --build api-gateway frontend
docker exec projecthub-api-gateway-1 cat /app/ocelot.runtime.json
```
