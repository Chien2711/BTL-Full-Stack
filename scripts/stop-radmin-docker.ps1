$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Stopping SprintFlow Docker stack..." -ForegroundColor Cyan
docker compose -f docker-compose.microservices.yml down

Write-Host "Stopped. Database volume is kept." -ForegroundColor Green
Write-Host "To reset database completely, run: docker compose -f docker-compose.microservices.yml down -v"
