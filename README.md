# SprintFlow - De Tai 06

He thong quan ly du an va phan cong cong viec theo mo hinh Kanban/Scrum, trien khai bang kien truc microservices.

## 1. Cac nhanh Git theo 3 nhom

Remote nop bai:

```text
https://github.com/Chien2711/BTL-Full-Stack.git
```

Nhanh du kien:

```text
main                  Tong hop code va tai lieu tich hop
nhom-1-chien2711      Project & Member Service
nhom-2-ngocbao72      Task & Kanban Service
nhom-3-tuanhimmnz     Comment & Notify Service, API Gateway, Frontend
```

## 2. Port mac dinh

```text
Frontend Vue/Nginx:   http://localhost:8080
API Gateway:          http://localhost:7000
Project Service:      http://localhost:5001/swagger
Task Service:         http://localhost:5002/swagger
Notify Service:       http://localhost:5003/swagger
SQL Server Docker:    localhost,14333
```

## 3. IP Radmin hien tai

```text
Nhom 1 - Chien2711:   26.43.9.197:5001
Nhom 2 - ngocbao72:   26.126.20.22:5002
Nhom 3 - Tuanhimmnz:  26.251.111.241:5003, 7000, 8080
```

Frontend dung chung cho ca 3 nhom:

```text
http://26.251.111.241:8080
```

Gateway dung chung:

```text
http://26.251.111.241:7000
```

## 4. Chay nhanh theo nhom

Nhom 1:

```powershell
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service project
```

Nhom 2:

```powershell
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service task
```

Nhom 3/server:

```powershell
.\scripts\open-radmin-firewall.ps1
.\scripts\start-group-service.ps1 -Service notify
.\scripts\start-group-service.ps1 -Service gateway
```

## 5. Kiem tra ket noi

Chay tren may nhom 3/server:

```powershell
.\scripts\check-radmin-services.ps1 -SkipGatewayRouteTest
```

Khi 3 service deu OK, chay test day du qua Gateway:

```powershell
.\scripts\check-radmin-services.ps1
```

## 6. Tai lieu can doc

```text
HUONG_DAN_3_NHOM_RADMIN_IP.md
HUONG_DAN_RADMIN_DOCKER.md
DOI_CHIEU_YEU_CAU_DE_TAI_06.md
```
