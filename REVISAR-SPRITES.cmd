@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'node' -ArgumentList 'scripts/serve-character-sprites.mjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
start "" "http://127.0.0.1:4606/output/sprite-audit-20261115/index.html"
