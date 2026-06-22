param(
  [string]$GatewayHost,
  [string]$ProjectHost,
  [string]$TaskHost,
  [string]$NotifyHost,
  [int]$ProjectPort = 5001,
  [int]$TaskPort = 5002,
  [int]$NotifyPort = 5003,
  [int]$GatewayPort = 7000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root "deployment\radmin-services.json"
$examplePath = Join-Path $root "deployment\radmin-services.example.json"

if (-not (Test-Path $configPath)) {
  Copy-Item $examplePath $configPath
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

if ($GatewayHost) {
  $config.GatewayPublicBaseUrl = "http://${GatewayHost}:${GatewayPort}"
}
if ($ProjectHost) {
  $config.Services.ProjectService.Host = $ProjectHost
  $config.Services.ProjectService.Port = $ProjectPort
}
if ($TaskHost) {
  $config.Services.TaskService.Host = $TaskHost
  $config.Services.TaskService.Port = $TaskPort
}
if ($NotifyHost) {
  $config.Services.NotifyService.Host = $NotifyHost
  $config.Services.NotifyService.Port = $NotifyPort
}

$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host "Updated Radmin service config:" -ForegroundColor Green
Write-Host "  $configPath"
Write-Host ""
Write-Host "Gateway: $($config.GatewayPublicBaseUrl)"
Write-Host "Project Service: $($config.Services.ProjectService.Host):$($config.Services.ProjectService.Port)"
Write-Host "Task Service:    $($config.Services.TaskService.Host):$($config.Services.TaskService.Port)"
Write-Host "Notify Service:  $($config.Services.NotifyService.Host):$($config.Services.NotifyService.Port)"
Write-Host ""
Write-Host "Restart Gateway after changing IP:"
Write-Host "  docker compose -f docker-compose.microservices.yml up -d --build api-gateway frontend"
