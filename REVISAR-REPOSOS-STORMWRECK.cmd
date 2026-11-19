@echo off
cd /d "%~dp0"
node scripts/install-character-modular.mjs
if errorlevel 1 goto fail
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/review-character-modular.ps1 -Mode Inspect -Campaign stormwreck-isle
exit /b %errorlevel%
:fail
echo No se ha podido validar la biblioteca de personajes.
pause
exit /b 1
