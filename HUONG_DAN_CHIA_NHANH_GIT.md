# Huong Dan Chia Nhanh Git Cho 3 Nhom

Repo nop bai:

```text
https://github.com/Chien2711/BTL-Full-Stack.git
```

## Nhanh va nguoi phu trach

```text
main                  Tong hop code va tai lieu tich hop
nhom-1-chien2711      Chien2711 - Project & Member Service
nhom-2-ngocbao72      ngocbao72 - Task & Kanban Service
nhom-3-tuanhimmnz     Tuanhimmnz - Comment & Notify Service, Gateway, Frontend
```

## Lenh clone theo tung nhom

Nhom 1:

```powershell
git clone -b nhom-1-chien2711 https://github.com/Chien2711/BTL-Full-Stack.git
cd BTL-Full-Stack
.\scripts\start-group-service.ps1 -Service project
```

Nhom 2:

```powershell
git clone -b nhom-2-ngocbao72 https://github.com/Chien2711/BTL-Full-Stack.git
cd BTL-Full-Stack
.\scripts\start-group-service.ps1 -Service task
```

Nhom 3:

```powershell
git clone -b nhom-3-tuanhimmnz https://github.com/Chien2711/BTL-Full-Stack.git
cd BTL-Full-Stack
.\scripts\start-group-service.ps1 -Service notify
.\scripts\start-group-service.ps1 -Service gateway
```

## Luu y khi doi IP Radmin

Sua IP tren may nhom 3/server:

```powershell
.\scripts\set-radmin-ips.ps1 `
  -GatewayHost 26.251.111.241 `
  -ProjectHost 26.43.9.197 `
  -TaskHost 26.126.20.22 `
  -NotifyHost 26.251.111.241
```

Sau khi sua IP, restart Gateway:

```powershell
docker compose -f docker-compose.microservices.yml up -d --build api-gateway frontend
```
