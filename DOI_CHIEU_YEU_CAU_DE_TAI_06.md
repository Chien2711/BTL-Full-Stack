# Doi Chieu Yeu Cau De Tai 06

## 1. Kien truc microservices

Dat:

```text
ProjectService  - Nhom 1 - Project & Member Service - port 5001 - ProjectDB
TaskService     - Nhom 2 - Task & Kanban Service    - port 5002 - TaskDB
NotifyService   - Nhom 3 - Comment & Notify Service - port 5003 - NotifyDB
ApiGateway      - Ocelot Gateway                    - port 7000
Frontend        - Vue 3 + Vuetify                   - port 8080
SQL Server      - moi service 1 database rieng
Docker Compose  - moi service 1 container rieng
Swagger UI      - moi service co Swagger rieng
JWT             - Notify/Auth cap token, Gateway validate token
```

## 2. Database per service

Dat:

```text
ProjectService tao ProjectDB
TaskService tao TaskDB
NotifyService tao NotifyDB
```

Khong dung foreign key cheo service. Du lieu lien ket giua service duoc luu bang reference id dang plain column.

## 3. API Gateway

Dat:

```text
Frontend chi goi http://<gateway>:7000/api/...
Gateway validate JWT truoc khi forward request
Gateway route /api/projects sang ProjectService
Gateway route /api/tasks sang TaskService
Gateway route /api/auth, /api/users, /api/notifications, /comments sang NotifyService
Gateway co rate limiting
```

File cau hinh IP khi chay Radmin:

```text
deployment/radmin-services.json
```

## 4. Frontend

Dat:

```text
Vue 3
Pinia
Goi API qua Gateway
Co giao dien Dashboard, Projects, Kanban, Task Detail Comment, Notifications, Profile, Settings
F12 thay request di ve /api qua Gateway
```

## 5. Nhom 3 - Comment & Notify Service

Dat:

```text
JWT login va quan ly user
CRUD comment theo task
Activity log tu dong
Notification list
Mark notification read/read all
Endpoint internal de TaskService publish event task
Swagger UI rieng tai /swagger
Database rieng NotifyDB
Docker container rieng
```

## 6. Cach thay test bang F12

Mo frontend:

```text
http://26.251.111.241:8080
```

Login bang tai khoan demo:

```text
admin@projecthub.com / admin123
```

F12/Network can thay request:

```text
POST http://26.251.111.241:7000/api/auth/login
GET  http://26.251.111.241:7000/api/projects
GET  http://26.251.111.241:7000/api/tasks
GET  http://26.251.111.241:7000/api/notifications
POST http://26.251.111.241:7000/api/tasks/{taskId}/comments
```

## 7. Tool kiem tra

Check service health:

```powershell
.\scripts\check-radmin-services.ps1 -SkipGatewayRouteTest
```

Check day du qua Gateway:

```powershell
.\scripts\check-radmin-services.ps1
```

Ket qua can dat:

```text
N1 Project Service OK
N2 Task Service OK
N3 Notify Service OK
API Gateway OK
Frontend Web OK
Gateway -> N3 Auth OK
Gateway -> N1 Projects OK
Gateway -> N2 Tasks OK
Gateway -> N3 Notifications OK
```
