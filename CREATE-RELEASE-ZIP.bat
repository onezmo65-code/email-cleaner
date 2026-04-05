@echo off
setlocal enabledelayedexpansion
title Creating Release ZIP...
color 0A
echo.
echo ============================================
echo  Creating EmailCleaner Release ZIP
echo ============================================
echo.

set "ZIPNAME=EmailCleaner-Windows-v1.1.zip"

powershell -NoProfile -Command "
try {
    \$tempdir = 'EmailCleaner-Temp'
    \$zippath = '%ZIPNAME%'

    # Cleanup old files
    if (Test-Path \$zippath) { Remove-Item \$zippath }
    if (Test-Path \$tempdir) { Remove-Item \$tempdir -Recurse -Force }

    Write-Host 'Copying backend...'
    New-Item -ItemType Directory \$tempdir -Force | Out-Null
    Copy-Item 'backend' \"\$tempdir\\backend\" -Recurse -Force

    Write-Host 'Copying frontend...'
    Copy-Item 'frontend' \"\$tempdir\\frontend\" -Recurse -Force

    Write-Host 'Copying setup files...'
    'SETUP.bat','START.bat','HOW-TO-START.txt','OAUTH_SETUP.md','README.md','package.json' | % { Copy-Item \$_ \$tempdir -Force }

    Write-Host 'Removing unnecessary files...'
    Remove-Item -Path \"\$tempdir\\backend\\node_modules\" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path \"\$tempdir\\backend\\dist\" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path \"\$tempdir\\backend\\email-cleaner.db*\" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path \"\$tempdir\\backend\\.env\" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path \"\$tempdir\\frontend\\node_modules\" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path \"\$tempdir\\frontend\\dist\" -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host 'Creating ZIP archive...'
    Compress-Archive -Path \"\$tempdir/*\" -DestinationPath \$zippath -Force

    \$size = (Get-Item \$zippath).Length
    Write-Host ''
    Write-Host '============================================' -ForegroundColor Green
    Write-Host 'ZIP CREATED SUCCESSFULLY!' -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Green
    Write-Host \"Filename: \$zippath\"
    Write-Host \"Size: \$('{0:N2}' -f (\$size/1MB)) MB\"
    Write-Host ''
    Write-Host 'Contents:'
    Write-Host '  - backend/ (source code only, no node_modules)'
    Write-Host '  - frontend/ (source code only, no node_modules)'
    Write-Host '  - SETUP.bat, START.bat (user scripts)'
    Write-Host '  - README.md, OAUTH_SETUP.md, HOW-TO-START.txt'
    Write-Host ''

    Remove-Item \$tempdir -Recurse -Force
} catch {
    Write-Host \"ERROR: \$_\" -ForegroundColor Red
    exit 1
}
"

if !errorlevel! neq 0 (
    echo.
    echo ERROR: ZIP creation failed
    echo.
    pause
    exit /b 1
)

echo Ready to upload to GitHub Release:
echo.
echo 1. Go to: https://github.com/onezmo65-code/email-cleaner/releases
echo 2. Click the pencil icon next to version v1.1
echo 3. Delete old %ZIPNAME% from Assets section
echo 4. Drag new %ZIPNAME% into Assets
echo 5. Click "Update release"
echo.
pause



