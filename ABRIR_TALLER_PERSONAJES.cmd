@echo off
cd /d "%~dp0"
node scripts\install-character-modular.mjs
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\review-character-modular.ps1 -Mode Inspect
