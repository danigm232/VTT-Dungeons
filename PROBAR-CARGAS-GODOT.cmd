@echo off
setlocal
cd /d "%~dp0"
call ABRIR-PECIO-GODOT.cmd --headless --editor --import --quit
call ABRIR-PECIO-GODOT.cmd -- --loading-review
