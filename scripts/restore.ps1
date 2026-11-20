param(
    [string]$BackupFile = '',
    [switch]$Force
)

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

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    if (-not (Test-Path -LiteralPath $BackupDir)) {
        throw "Folder backup tidak ditemukan: $BackupDir"
    }
    $newest = Get-ChildItem -Path $BackupDir -Filter '*.sql' -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $newest) {
        throw "Tidak ada file backup *.sql di $BackupDir"
    }
    $resolvedBackup = $newest.FullName
} else {
    if (Test-Path -LiteralPath $BackupFile) {
        $resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
    } elseif (Test-Path -LiteralPath (Join-Path $ProjectRoot $BackupFile)) {
        $resolvedBackup = (Resolve-Path -LiteralPath (Join-Path $ProjectRoot $BackupFile)).Path
    } else {
        throw "File backup tidak ditemukan: $BackupFile"
    }
}

$envVars = Read-DotEnv -Path $EnvFile
$dbHost = if ($envVars['DB_HOST']) { $envVars['DB_HOST'] } else { '127.0.0.1' }
$dbPort = if ($envVars['DB_PORT']) { $envVars['DB_PORT'] } else { '3306' }
$dbName = if ($envVars['DB_DATABASE']) { $envVars['DB_DATABASE'] } else { 'siasat_db' }
$dbUser = if ($envVars['DB_USERNAME']) { $envVars['DB_USERNAME'] } else { 'root' }
$dbPass = if ($envVars.ContainsKey('DB_PASSWORD')) { $envVars['DB_PASSWORD'] } else { '' }

$mysqlExe = Find-MySqlTool -ExeName 'mysql.exe'

if (-not $Force) {
    $confirm = Read-Host "Restore '$resolvedBackup' ke database '$dbName' ($dbHost`:$dbPort)? Data saat ini akan ditimpa. Ketik 'YES' untuk melanjutkan"
    if ($confirm -ne 'YES') {
        Write-Host '[RESTORE DIBATALKAN] Tidak ada perubahan pada database.'
        exit 0
    }
}

$mysqlArgs = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    '--default-character-set=utf8mb4',
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

    $proc = Start-Process -FilePath $mysqlExe `
        -ArgumentList $mysqlArgs `
        -RedirectStandardInput $resolvedBackup `
        -NoNewWindow `
        -Wait `
        -PassThru

    if ($proc.ExitCode -ne 0) {
        throw "mysql restore gagal dengan exit code $($proc.ExitCode)."
    }
} finally {
    if ($hadMySqlPwd) {
        $env:MYSQL_PWD = $prevMySqlPwd
    } else {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
}

Write-Host "[RESTORE OK] mysql    : $mysqlExe"
Write-Host "[RESTORE OK] Database : $dbName ($dbHost`:$dbPort)"
Write-Host "[RESTORE OK] Sumber   : $resolvedBackup"
