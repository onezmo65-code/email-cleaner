@echo off
title Creating Release ZIP...
echo.
echo Creating EmailCleaner-Windows-v1.1.zip ...
echo.

powershell -Command ^
  "Compress-Archive -Force -Path ^
    '%~dp0backend', ^
    '%~dp0frontend', ^
    '%~dp0SETUP.bat', ^
    '%~dp0START.bat', ^
    '%~dp0README.md', ^
    '%~dp0OAUTH_SETUP.md', ^
    '%~dp0package.json' ^
  -DestinationPath '%~dp0EmailCleaner-Windows-v1.1.zip' ^
  -CompressionLevel Optimal"

echo.
echo Done! File created: EmailCleaner-Windows-v1.1.zip
echo.
echo Now upload this file to the GitHub release:
echo 1. Go to github.com/onezmo65-code/email-cleaner/releases
echo 2. Click the pencil (edit) on v1.1
echo 3. Drag EmailCleaner-Windows-v1.1.zip into the Assets area
echo 4. Click Update release
echo.
pause
