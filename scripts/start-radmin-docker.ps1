$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting SprintFlow stack in Docker background..." -ForegroundColor Cyan
docker compose -f docker-compose.microservices.yml up -d --build

$radminIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -like "*Radmin*" -and $_.IPAddress -notlike "169.254.*" } |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Host ""
Write-Host "Docker containers:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

Write-Host ""
if ($radminIp) {
  Write-Host "Radmin VPN URL for all groups:" -ForegroundColor Green
  Write-Host "  Web app:        http://$radminIp:8080"
  Write-Host "  API Gateway:    http://$radminIp:7000/health"
  Write-Host "  Project Swagger:http://$radminIp:5001/swagger"
  Write-Host "  Task Swagger:   http://$radminIp:5002/swagger"
  Write-Host "  Notify Swagger: http://$radminIp:5003/swagger"
  Write-Host "  SQL Server:     $radminIp,14333"
} else {
  Write-Host "Could not detect Radmin IP. Open Radmin VPN and copy this machine's VPN IP." -ForegroundColor Yellow
  Write-Host "Use: http://<RADMIN_SERVER_IP>:8080"
}

Write-Host ""
Write-Host "Accounts:" -ForegroundColor Cyan
Write-Host "  admin@projecthub.com / admin123"
Write-Host "  nhanvien1@projecthub.com / 123456"
