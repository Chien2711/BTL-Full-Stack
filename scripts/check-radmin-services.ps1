param(
  [string]$ConfigPath,
  [string]$Email = "admin@projecthub.com",
  [string]$Password = "admin123",
  [switch]$SkipGatewayRouteTest
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $root "deployment\radmin-services.json"
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Target,
    [string]$Status,
    [string]$Detail
  )
  $script:results.Add([pscustomobject]@{
    Name = $Name
    Target = $Target
    Status = $Status
    Detail = $Detail
  })
}

function Test-HttpHealth {
  param(
    [string]$Name,
    [string]$ServiceHost,
    [int]$Port
  )
  $target = "http://${ServiceHost}:${Port}/health"
  try {
    $response = Invoke-RestMethod -Uri $target -Method Get -TimeoutSec 8
    $detail = "ok"
    if ($response.status) { $detail = $response.status }
    Add-Result $Name $target "OK" $detail
  } catch {
    Add-Result $Name $target "FAIL" $_.Exception.Message
  }
}

function Test-TcpPort {
  param(
    [string]$Name,
    [string]$ServiceHost,
    [int]$Port
  )
  try {
    $ok = Test-NetConnection -ComputerName $ServiceHost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    $status = "FAIL"
    $detail = "TCP closed or blocked"
    if ($ok) {
      $status = "OK"
      $detail = "TCP open"
    }
    Add-Result $Name "${ServiceHost}:${Port}" $status $detail
  } catch {
    Add-Result $Name "${ServiceHost}:${Port}" "FAIL" $_.Exception.Message
  }
}

$project = $config.Services.ProjectService
$task = $config.Services.TaskService
$notify = $config.Services.NotifyService

Test-HttpHealth "N1 Project Service" $project.Host $project.Port
Test-HttpHealth "N2 Task Service" $task.Host $task.Port
Test-HttpHealth "N3 Notify Service" $notify.Host $notify.Port

$gatewayUri = [Uri]$config.GatewayPublicBaseUrl
$gatewayHost = $gatewayUri.Host
$gatewayPort = if ($gatewayUri.Port -gt 0) { $gatewayUri.Port } else { 7000 }

Test-HttpHealth "API Gateway" $gatewayHost $gatewayPort
Test-TcpPort "Frontend Web" $gatewayHost 8080

if (-not $SkipGatewayRouteTest) {
  $gatewayBase = $config.GatewayPublicBaseUrl.TrimEnd("/")
  try {
    $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$gatewayBase/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 12
    $headers = @{ Authorization = "Bearer $($login.token)" }
    Add-Result "Gateway -> N3 Auth" "$gatewayBase/api/auth/login" "OK" $login.user.email

    $projects = Invoke-RestMethod -Uri "$gatewayBase/api/projects" -Headers $headers -TimeoutSec 12
    Add-Result "Gateway -> N1 Projects" "$gatewayBase/api/projects" "OK" ("items=" + @($projects).Count)

    $tasks = Invoke-RestMethod -Uri "$gatewayBase/api/tasks" -Headers $headers -TimeoutSec 12
    Add-Result "Gateway -> N2 Tasks" "$gatewayBase/api/tasks" "OK" ("items=" + @($tasks).Count)

    $notifications = Invoke-RestMethod -Uri "$gatewayBase/api/notifications" -Headers $headers -TimeoutSec 12
    Add-Result "Gateway -> N3 Notifications" "$gatewayBase/api/notifications" "OK" ("items=" + @($notifications).Count)
  } catch {
    Add-Result "Gateway route test" $gatewayBase "FAIL" $_.Exception.Message
  }
}

Write-Host ""
Write-Host "Radmin connectivity check" -ForegroundColor Cyan
Write-Host "Config: $ConfigPath"
Write-Host ""
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -ne "OK" })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Some checks failed. Verify Radmin IP, firewall, Docker containers, and service ports." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "All checks passed." -ForegroundColor Green
