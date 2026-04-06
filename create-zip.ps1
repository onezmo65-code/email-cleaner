# Email Cleaner ZIP Creation Script
param([string]$ProjectDir = (Get-Location).Path + '\')

$TempDir = Join-Path $ProjectDir 'EmailCleaner-Temp'
$ZipPath = Join-Path $ProjectDir 'EmailCleaner-Windows-v1.1.zip'

Write-Host "Creating Release ZIP..." -ForegroundColor Cyan

try {
    # Clean old zip
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
        Write-Host "Removed old ZIP file"
    }

    # Clean temp directory
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    mkdir $TempDir | Out-Null

    # Copy backend (excluding node_modules and sensitive files)
    Write-Host "Copying backend..."
    Copy-Item (Join-Path $ProjectDir 'backend') (Join-Path $TempDir 'backend') -Recurse
    foreach ($exclude in @('node_modules', 'dist', 'email-cleaner.db', 'email-cleaner.db-shm', 'email-cleaner.db-wal', '.env')) {
        $path = Join-Path (Join-Path $TempDir 'backend') $exclude
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # Copy frontend (excluding node_modules, dist)
    Write-Host "Copying frontend..."
    Copy-Item (Join-Path $ProjectDir 'frontend') (Join-Path $TempDir 'frontend') -Recurse
    foreach ($exclude in @('node_modules', 'dist')) {
        $path = Join-Path (Join-Path $TempDir 'frontend') $exclude
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # Copy root files
    Write-Host "Copying setup files..."
    foreach ($file in @('SETUP.bat', 'START.bat', 'SETUP.sh', 'START.sh', 'HOW-TO-START.txt', 'OAUTH_SETUP.md', 'README.md', 'package.json', '.gitignore')) {
        $src = Join-Path $ProjectDir $file
        if (Test-Path $src) {
            Copy-Item $src $TempDir -Force -ErrorAction SilentlyContinue
        }
    }

    # Create ZIP
    Write-Host "Creating ZIP archive..."
    Compress-Archive -Path (Join-Path $TempDir '*') -DestinationPath $ZipPath -Force

    # Report
    $size = (Get-Item $ZipPath).Length / 1MB
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "ZIP CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "Filename: EmailCleaner-Windows-v1.1.zip"
    Write-Host "Size: $([math]::Round($size, 2)) MB"
    Write-Host ""

    # Verify contents
    Write-Host "Contents:"
    [System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)

    $dirs = @()
    $rootFiles = @()

    foreach ($entry in $archive.Entries) {
        if ($entry.FullName.Contains('/')) {
            $topDir = $entry.FullName.Split('/')[0]
            if ($dirs -notcontains $topDir) { $dirs += $topDir }
        } elseif (!$entry.Name.EndsWith('/')) {
            $rootFiles += $entry.Name
        }
    }

    Write-Host "  Directories: $($dirs -join ', ')"
    if ($rootFiles) {
        Write-Host "  Root files: $($rootFiles -join ', ')"
    }

    $archive.Dispose()

    # Cleanup
    Write-Host ""
    Write-Host "Cleaning up..."
    Remove-Item $TempDir -Recurse -Force

    Write-Host ""
    Write-Host "Ready to upload to GitHub Release!"

} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue }
    exit 1
}
