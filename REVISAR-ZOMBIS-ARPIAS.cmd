@echo off
cd /d "%~dp0"
set SPRITE_REVIEW_PORT=4607
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:4607/output/npc-sprites-20261115/index.html' -UseBasicParsing -TimeoutSec 2 | Out-Null } catch { Start-Process -FilePath 'node' -ArgumentList 'scripts/serve-character-sprites.mjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden }"
start "" "http://127.0.0.1:4607/output/npc-sprites-20261115/index.html"
