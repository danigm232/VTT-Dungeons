@echo off
setlocal
cd /d "%~dp0"
call "%~dp0ABRIR-PECIO-GODOT.cmd" --script res://loading/review_loading_frames.gd -- --loading-review
if errorlevel 1 pause
