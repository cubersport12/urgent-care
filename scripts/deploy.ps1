# Deploy Urgent Care to VPS (gymai-style layout).
# Usage:
#   .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -SkipBuild
#   .\scripts\deploy.ps1 -SkipFrontend
#   .\scripts\deploy.ps1 -MigrateSupabase

param(
    [string]$HostName = "77.91.90.39",
    [string]$User = "root",
    [string]$SshKey = "$env:USERPROFILE\.ssh\id_ed25519_gymai",
    [switch]$SkipBuild,
    [switch]$SkipFrontend,
    [switch]$MigrateSupabase
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$SshTarget = "${User}@${HostName}"
$SshArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new")

function Invoke-Ssh([string]$Command) {
    & ssh @SshArgs $SshTarget $Command
    if ($LASTEXITCODE -ne 0) { throw "SSH failed: $Command" }
}

function Invoke-Scp([string[]]$Source, [string]$Dest) {
    & scp @SshArgs -r @Source "${SshTarget}:${Dest}"
    if ($LASTEXITCODE -ne 0) { throw "SCP failed -> $Dest" }
}

Set-Location $RepoRoot
Write-Host "==> Deploy target: $SshTarget" -ForegroundColor Cyan

if (-not (Test-Path $SshKey)) {
    throw "SSH key not found: $SshKey"
}

if (-not $SkipBuild -and -not $SkipFrontend) {
    Write-Host "==> Building start-page" -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot "start-page")
    if (-not (Test-Path "node_modules")) { npm install --legacy-peer-deps }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "start-page build failed" }
    Pop-Location

    Write-Host "==> Building content-builder (VPS base-href)" -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot "content-builder-web-app")
    if (-not (Test-Path "node_modules")) { npm ci --legacy-peer-deps }
    npm run build:vps
    if ($LASTEXITCODE -ne 0) { throw "content-builder build failed" }
    Pop-Location

    Write-Host "==> Building mobile-app web (VPS baseUrl)" -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot "mobile-app")
    if (-not (Test-Path "node_modules")) { npm install }
    npm run web:build:vps
    if ($LASTEXITCODE -ne 0) { throw "mobile-app web build failed" }
    Pop-Location
}

Write-Host "==> Preparing remote directories" -ForegroundColor Cyan
Invoke-Ssh "mkdir -p /opt/urgent-care/backend /opt/urgent-care/deploy /var/www/urgent-care/releases"

Write-Host "==> Uploading backend" -ForegroundColor Cyan
$backendItems = @(
    "backend/app",
    "backend/alembic",
    "backend/alembic.ini",
    "backend/scripts",
    "backend/pyproject.toml",
    "backend/Dockerfile",
    "backend/docker-compose.prod.yml",
    "backend/.env.example"
) | ForEach-Object { Join-Path $RepoRoot $_ }

Invoke-Scp $backendItems "/opt/urgent-care/backend/"

Write-Host "==> Uploading deploy/" -ForegroundColor Cyan
Invoke-Scp @((Join-Path $RepoRoot "deploy")) "/opt/urgent-care/"

if (-not $SkipFrontend) {
    Write-Host "==> Uploading static sites" -ForegroundColor Cyan
    $distRoot = Join-Path $RepoRoot "dist"
    if (-not (Test-Path $distRoot)) {
        throw "dist/ missing - run without -SkipBuild"
    }

    $startFiles = Get-ChildItem $distRoot -File
    $startDirs = Get-ChildItem $distRoot -Directory | Where-Object { $_.Name -notin @("content-builder", "mobile-app") }
    if ($startFiles.Count -gt 0) {
        Invoke-Scp ($startFiles.FullName) "/var/www/urgent-care/"
    }
    foreach ($dir in $startDirs) {
        Invoke-Scp @($dir.FullName) "/var/www/urgent-care/"
    }

    if (Test-Path (Join-Path $distRoot "content-builder")) {
        Invoke-Ssh "rm -rf /var/www/urgent-care/content-builder"
        Invoke-Scp @((Join-Path $distRoot "content-builder")) "/var/www/urgent-care/"
    }
    if (Test-Path (Join-Path $distRoot "mobile-app")) {
        Invoke-Ssh "rm -rf /var/www/urgent-care/mobile-app"
        Invoke-Scp @((Join-Path $distRoot "mobile-app")) "/var/www/urgent-care/"
    }

    # scp often creates 700 dirs; nginx (www-data) must traverse them
    Invoke-Ssh "chmod -R a+rX /var/www/urgent-care"
}

$localSupabaseKey = ""
$localEnvPath = Join-Path $RepoRoot "backend\.env"
if (Test-Path $localEnvPath) {
    foreach ($line in Get-Content $localEnvPath) {
        if ($line -match '^SUPABASE_SERVICE_KEY=(.*)$') {
            $localSupabaseKey = $Matches[1].Trim().Trim("'").Trim('"')
            break
        }
    }
}

Write-Host "==> Ensuring backend .env on server" -ForegroundColor Cyan
# Pass key via env to avoid shell quoting issues
$envB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($localSupabaseKey))
Invoke-Ssh "SUPABASE_KEY_B64='$envB64' bash /opt/urgent-care/deploy/remote/bootstrap-env.sh $HostName"

Write-Host "==> Configuring nginx" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/setup-nginx.sh"

Write-Host "==> Ensuring swap" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/ensure-swap.sh"

Write-Host "==> DB backup (pre-deploy)" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/backup-db.sh pre-deploy"

Write-Host "==> Installing daily DB backup cron" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/install-backup-cron.sh"

Write-Host "==> Starting docker compose (prod)" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/start-stack.sh"

Write-Host "==> Ensuring admin user" -ForegroundColor Cyan
Invoke-Ssh "bash /opt/urgent-care/deploy/remote/ensure-admin.sh"

if ($MigrateSupabase) {
    Write-Host "==> Migrating data from Supabase" -ForegroundColor Cyan
    Invoke-Ssh "cd /opt/urgent-care/backend && docker compose -f docker-compose.prod.yml exec -T api python scripts/migrate_from_supabase.py"
}

Write-Host ""
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "  Start page:      http://$HostName/"
Write-Host "  Content builder: http://$HostName/content-builder/"
Write-Host "  Mobile web:      http://$HostName/mobile-app/"
Write-Host "  API health:      http://$HostName/health"
Write-Host "  Docs:            http://$HostName/docs"
Write-Host "Admin: test@yandex.ru / test"
