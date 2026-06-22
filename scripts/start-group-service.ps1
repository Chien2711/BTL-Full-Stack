param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("project", "task", "notify", "gateway", "all")]
  [string]$Service
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root "deployment\radmin-services.json"
Set-Location $root

if (-not (Test-Path $configPath)) {
  throw "Missing config: $configPath. Copy deployment/radmin-services.example.json to deployment/radmin-services.json first."
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$env:NOTIFY_SERVICE_URL = "http://$($config.Services.NotifyService.Host):$($config.Services.NotifyService.Port)"

switch ($Service) {
  "project" {
    docker compose -f docker-compose.microservices.yml up -d --build sqlserver project-service
  }
  "task" {
    docker compose -f docker-compose.microservices.yml up -d --build sqlserver task-service
  }
  "notify" {
    docker compose -f docker-compose.microservices.yml up -d --build sqlserver notify-service
  }
  "gateway" {
    docker compose -f docker-compose.microservices.yml up -d --build api-gateway frontend
  }
  "all" {
    docker compose -f docker-compose.microservices.yml up -d --build
  }
}

Write-Host ""
Write-Host "Started: $Service" -ForegroundColor Green
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
