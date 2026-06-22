$ErrorActionPreference = "Stop"

$rules = @(
  @{ Name = "SprintFlow Web 8080"; Port = 8080 },
  @{ Name = "SprintFlow API Gateway 7000"; Port = 7000 },
  @{ Name = "SprintFlow Project Swagger 5001"; Port = 5001 },
  @{ Name = "SprintFlow Task Swagger 5002"; Port = 5002 },
  @{ Name = "SprintFlow Notify Swagger 5003"; Port = 5003 },
  @{ Name = "SprintFlow SQL Server Docker 14333"; Port = 14333 }
)

foreach ($rule in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
  if (-not $existing) {
    New-NetFirewallRule `
      -DisplayName $rule.Name `
      -Direction Inbound `
      -Action Allow `
      -Protocol TCP `
      -LocalPort $rule.Port | Out-Null
    Write-Host "Opened TCP $($rule.Port): $($rule.Name)" -ForegroundColor Green
  } else {
    Write-Host "Exists: $($rule.Name)" -ForegroundColor Yellow
  }
}

Write-Host "Firewall rules are ready. Run this script as Administrator if access is denied." -ForegroundColor Cyan
