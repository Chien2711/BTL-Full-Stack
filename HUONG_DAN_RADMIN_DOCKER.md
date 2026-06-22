# Hướng Dẫn Triển Khai SprintFlow Qua Radmin VPN + Docker

Mục tiêu: 3 nhóm ở 3 IP khác nhau cùng kết nối vào một server chung qua Radmin VPN. Server chạy toàn bộ hệ thống bằng Docker nền, các nhóm chỉ mở trình duyệt và gọi cùng API Gateway.

## 1. Kiến trúc chạy thật

Server chạy 5 container:

- `frontend`: Vue 3 build production, port `8080`
- `api-gateway`: ASP.NET Core Ocelot Gateway, port `7000`
- `project-service`: Project & Member Service, port `5001`
- `task-service`: Task & Kanban Service, port `5002`
- `notify-service`: Comment/Auth/Notification Service, port `5003`
- `sqlserver`: SQL Server container, port ngoài `14333`

Database riêng:

- `ProjectDB`
- `TaskDB`
- `NotifyDB`

Frontend gọi API theo hostname hiện tại:

```text
http://<RADMIN_SERVER_IP>:7000/api
```

Vì vậy khi nhóm khác mở web qua Radmin IP, F12 vẫn thấy request đi qua API Gateway.

## 2. Chuẩn bị trên máy làm server

Cài và bật:

- Docker Desktop
- Radmin VPN

Tạo hoặc tham gia cùng một Radmin network cho cả 3 nhóm. Ví dụ:

```text
Network name: SprintFlow-Demo
Password: tự đặt và gửi cho 3 nhóm
```

Lấy IP Radmin của máy server trong app Radmin VPN, thường có dạng `26.x.x.x`.

## 3. Mở firewall trên máy server

Mở PowerShell bằng quyền Administrator tại thư mục `ProjectHub`, chạy:

```powershell
.\scripts\open-radmin-firewall.ps1
```

Các port được mở:

- `8080`: web app cho 3 nhóm truy cập
- `7000`: API Gateway
- `5001`: Project Swagger
- `5002`: Task Swagger
- `5003`: Notify Swagger
- `14333`: SQL Server Docker, chỉ cần nếu muốn kiểm tra DB bằng SSMS

Nếu không muốn mở SQL cho máy khác, có thể bỏ port `14333` trong firewall.

## 4. Chạy hệ thống nền bằng Docker

Tại thư mục `ProjectHub`, chạy:

```powershell
.\scripts\start-radmin-docker.ps1
```

Hoặc chạy trực tiếp:

```powershell
docker compose -f docker-compose.microservices.yml up -d --build
```

Kiểm tra container:

```powershell
docker ps
```

Phải thấy các container:

```text
projecthub-frontend-1
projecthub-api-gateway-1
projecthub-project-service-1
projecthub-task-service-1
projecthub-notify-service-1
projecthub-sqlserver-1
```

## 5. URL cho 3 nhóm truy cập

Thay `<RADMIN_SERVER_IP>` bằng IP Radmin của máy server.

```text
Web app:         http://<RADMIN_SERVER_IP>:8080
API Gateway:     http://<RADMIN_SERVER_IP>:7000/health
Project Swagger: http://<RADMIN_SERVER_IP>:5001/swagger
Task Swagger:    http://<RADMIN_SERVER_IP>:5002/swagger
Notify Swagger:  http://<RADMIN_SERVER_IP>:5003/swagger
```

Tài khoản demo:

```text
Admin:  admin@projecthub.com / admin123
Member: nhanvien1@projecthub.com / 123456
Viewer: viewer@projecthub.com / 123456
```

## 6. Cách thầy kiểm tra bằng F12

Mở:

```text
http://<RADMIN_SERVER_IP>:8080
```

Login bằng admin, mở F12 > Network. Các request quan trọng:

```text
POST http://<RADMIN_SERVER_IP>:7000/api/auth/login
GET  http://<RADMIN_SERVER_IP>:7000/api/users
GET  http://<RADMIN_SERVER_IP>:7000/api/projects
GET  http://<RADMIN_SERVER_IP>:7000/api/tasks
GET  http://<RADMIN_SERVER_IP>:7000/api/notifications?status=all
```

Chứng minh đủ 3 nhóm:

- Nhóm 1: `/api/projects` -> Project Service -> `ProjectDB`
- Nhóm 2: `/api/tasks` -> Task Service -> `TaskDB`
- Nhóm 3: `/api/auth`, `/api/users`, `/api/tasks/{id}/comments`, `/api/notifications` -> Notify Service -> `NotifyDB`

## 7. Kịch bản demo nhanh

1. Login admin.
2. Vào `Dự án`, tạo hoặc xem project.
3. Vào `Kanban`, tạo task và giao cho `Nguyễn Văn A`.
4. Logout, login `nhanvien1@projecthub.com / 123456`.
5. Vào `Thông báo`, thấy notification `task.assigned`.
6. Mở Task Detail, thêm bình luận.
7. Login admin, vào `Thông báo`, thấy notification `comment.created`.
8. Vào `Cài đặt`, bấm `Kiểm tra Gateway`, phải hiện `GATEWAY OK`.
9. Vào `Hồ sơ`, cập nhật tên/avatar để chứng minh User/Profile thuộc nhóm 3.

## 8. Kiểm tra SQL Server Docker

Kết nối bằng SSMS từ máy server hoặc máy khác trong Radmin nếu đã mở port:

```text
Server:   <RADMIN_SERVER_IP>,14333
Login:    sa
Password: ProjectHub@2026
Trust server certificate: bật
```

Kiểm tra:

```sql
SELECT name
FROM sys.databases
WHERE name IN ('ProjectDB', 'TaskDB', 'NotifyDB');

SELECT COUNT(*) FROM ProjectDB.dbo.Projects;
SELECT COUNT(*) FROM TaskDB.dbo.Tasks;
SELECT COUNT(*) FROM NotifyDB.dbo.Comments;
SELECT COUNT(*) FROM NotifyDB.dbo.Notifications;
SELECT COUNT(*) FROM NotifyDB.dbo.ActivityLogs;
```

## 9. Dừng hệ thống

Dừng nhưng giữ database:

```powershell
.\scripts\stop-radmin-docker.ps1
```

Hoặc:

```powershell
docker compose -f docker-compose.microservices.yml down
```

Xóa sạch database Docker để chạy lại từ đầu:

```powershell
docker compose -f docker-compose.microservices.yml down -v
```

## 10. Xử lý lỗi thường gặp

Không vào được web:

```powershell
docker ps
```

Kiểm tra container `frontend` có port `8080:80` chưa.

Không gọi được API:

```powershell
curl http://<RADMIN_SERVER_IP>:7000/health
docker logs projecthub-api-gateway-1 --tail 100
```

Máy nhóm khác không truy cập được:

- Kiểm tra cùng Radmin network.
- Ping thử `<RADMIN_SERVER_IP>`.
- Chạy `.\scripts\open-radmin-firewall.ps1` bằng quyền Administrator.
- Kiểm tra Windows Defender Firewall không chặn Docker Desktop.

SQL Server chưa sẵn sàng:

- Đợi 60-90 giây sau khi `docker compose up -d`.
- Kiểm tra log:

```powershell
docker logs projecthub-sqlserver-1 --tail 100
```

Frontend vẫn gọi localhost:

- Hard refresh trình duyệt bằng `Ctrl + F5`.
- Đảm bảo đang mở `http://<RADMIN_SERVER_IP>:8080`, không mở bản Vite `5173`.
