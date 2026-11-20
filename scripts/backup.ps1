$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot 'backend\.env'
$BackupDir = Join-Path $ProjectRoot 'backups'

function Read-DotEnv {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $map
    }
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }
        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) {
            continue
        }
        $key = $trimmed.Substring(0, $idx).Trim()
        $val = $trimmed.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            if ($val.Length -ge 2) {
                $val = $val.Substring(1, $val.Length - 2)
            }
        }
        $map[$key] = $val
    }
    return $map
}

function Find-MySqlTool {
    param([string]$ExeName)
    $wampMatches = Get-ChildItem -Path "C:\wamp64\bin\mysql\mysql*\bin\$ExeName" -ErrorAction SilentlyContinue
    if ($wampMatches) {
        $latest = $wampMatches | Sort-Object {
            if ($_.FullName -match 'mysql(\d+(?:\.\d+)*)') {
                [version]$Matches[1]
            } else {
                [version]'0.0'
            }
        } -Descending | Select-Object -First 1
        return $latest.FullName
    }

    $cmd = Get-Command ([System.IO.Path]::GetFileNameWithoutExtension($ExeName)) -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    throw "Tidak dapat menemukan '$ExeName' di C:\wamp64\bin\mysql\mysql*\bin\ maupun PATH."
}

$envVars = Read-DotEnv -Path $EnvFile
$dbHost = if ($envVars['DB_HOST']) { $envVars['DB_HOST'] } else { '127.0.0.1' }
$dbPort = if ($envVars['DB_PORT']) { $envVars['DB_PORT'] } else { '3306' }
$dbName = if ($envVars['DB_DATABASE']) { $envVars['DB_DATABASE'] } else { 'siasat_db' }
$dbUser = if ($envVars['DB_USERNAME']) { $envVars['DB_USERNAME'] } else { 'root' }
$dbPass = if ($envVars.ContainsKey('DB_PASSWORD')) { $envVars['DB_PASSWORD'] } else { '' }

$mysqldumpExe = Find-MySqlTool -ExeName 'mysqldump.exe'

if (-not (Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = Join-Path $BackupDir "${dbName}_${timestamp}.sql"

$dumpArgs = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    '--single-transaction',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
    "--result-file=$backupFile",
    $dbName
)

$hadMySqlPwd = Test-Path Env:MYSQL_PWD
$prevMySqlPwd = if ($hadMySqlPwd) { $env:MYSQL_PWD } else { $null }

try {
    if (-not [string]::IsNullOrEmpty($dbPass)) {
        $env:MYSQL_PWD = $dbPass
    } else {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }

    & $mysqldumpExe @dumpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump gagal dengan exit code $LASTEXITCODE."
    }
} finally {
    if ($hadMySqlPwd) {
        $env:MYSQL_PWD = $prevMySqlPwd
    } else {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path -LiteralPath $backupFile)) {
    throw "File backup tidak ditemukan setelah mysqldump: $backupFile"
}

$fileInfo = Get-Item -LiteralPath $backupFile
if ($fileInfo.Length -le 0) {
    Remove-Item -LiteralPath $backupFile -Force -ErrorAction SilentlyContinue
    throw "File backup kosong (0 bytes): $backupFile"
}

$cutoff = (Get-Date).AddDays(-7)
$expiredFiles = @(Get-ChildItem -Path $BackupDir -Filter '*.sql' -File | Where-Object { $_.LastWriteTime -lt $cutoff })
foreach ($oldFile in $expiredFiles) {
    Remove-Item -LiteralPath $oldFile.FullName -Force
}

$remainingFiles = @(Get-ChildItem -Path $BackupDir -Filter '*.sql' -File)
$sizeKb = [Math]::Round($fileInfo.Length / 1KB, 2)

Write-Host "[BACKUP OK] mysqldump : $mysqldumpExe"
Write-Host "[BACKUP OK] Database  : $dbName ($dbHost`:$dbPort)"
Write-Host "[BACKUP OK] File      : $backupFile ($sizeKb KB / $($fileInfo.Length) bytes)"
Write-Host "[RETENTION] Dihapus (>7 hari): $($expiredFiles.Count) file | Tersisa: $($remainingFiles.Count) file"
