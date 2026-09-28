@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "DND_NODE="
if exist "%ProgramFiles%\nodejs\node.exe" set "DND_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined DND_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "DND_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined DND_NODE for /f "delims=" %%I in ('where node 2^>nul') do if not defined DND_NODE set "DND_NODE=%%I"
if not defined DND_NODE (echo ERROR: Instala Node.js 24.21.0 desde https://nodejs.org/ & pause & exit /b 1)
if not "%DND_NODE:codex-runtimes=%"=="%DND_NODE%" (echo ERROR: Solo se ha encontrado el Node interno de Codex, que Windows no puede usar para iniciar el juego. & echo Instala Node.js 24.21.0 desde https://nodejs.org/ y vuelve a ejecutar INICIAR.cmd. & pause & exit /b 1)
"%DND_NODE%" -e "const [a,b,c]=process.versions.node.split('.').map(Number);process.exit(a===24&&(b>21||(b===21&&c>=0))?0:1)"
if errorlevel 1 (echo ERROR: Se necesita Node.js 24.21.0 o posterior de la rama 24. & pause & exit /b 1)
if not defined PORT set "PORT=3000"
set "DND_PORT=%PORT%"
set "DND_SAVE_ROOT=%DUNGEONS_DATA_DIR%"
if not defined DND_SAVE_ROOT set "DND_SAVE_ROOT=%CD%\data\saves"
if not exist "node_modules\vite\bin\vite.js" (echo ERROR: Faltan dependencias. Ejecuta INSTALAR.cmd y vuelve a iniciar. & pause & exit /b 1)
if not exist "node_modules\typescript\bin\tsc" (echo ERROR: Faltan dependencias. Ejecuta INSTALAR.cmd y vuelve a iniciar. & pause & exit /b 1)
if /I "%DUNGEONS_CAMPAIGN%"=="camp-rests" set "DUNGEONS_CAMPAIGN=stormwreck-isle"
if not defined DUNGEONS_CAMPAIGN call :choose_campaign
:prepare
"%DND_NODE%" scripts\check-port-free.mjs %DND_PORT%
if errorlevel 3 (echo ERROR: No se pudo comprobar el puerto %DND_PORT%. & pause & exit /b 1)
if errorlevel 2 goto :startup_failed
echo Actualizando la aplicacion para incluir los mapas y cambios mas recientes...
"%DND_NODE%" node_modules\vite\bin\vite.js build --configLoader runner
if errorlevel 1 (echo ERROR: No se pudo compilar la interfaz. Revisa el mensaje anterior. & pause & exit /b 1)
"%DND_NODE%" node_modules\typescript\bin\tsc -p tsconfig.server.json
if errorlevel 1 (echo ERROR: No se pudo compilar el servidor. Revisa el mensaje anterior. & pause & exit /b 1)
if not exist "dist\server\apps\server\index.js" (echo ERROR: La Alpha no esta compilada. Ejecuta INSTALAR.cmd primero. & pause & exit /b 1)
set "DUNGEONS_OPEN_DM=1"
:launch
echo Iniciando D^&D Immersive Engine...
if /I "%DUNGEONS_CAMPAIGN%"=="d8-night-private" echo Campana: D8 Night ^(one-shot privado^)
if /I "%DUNGEONS_CAMPAIGN%"=="stormwreck-isle" echo Campana: Los Dragones de la Isla de las Tempestades ^(incluye sus campamentos^)
echo Si Windows pregunta por el firewall, permite redes privadas para que entren los moviles.
"%DND_NODE%" dist\server\apps\server\index.js
if not errorlevel 1 exit /b 0
goto :startup_failed
:startup_failed
echo.
echo El servidor no ha podido iniciarse. Puede que haya otra mesa D^&D abierta o que el puerto %DND_PORT% este ocupado.
choice /C AS /N /M "[A] Actualizar esta mesa (guardar y reiniciar)  [S] Salir"
if errorlevel 2 exit /b 1
echo.
echo Guardando y cerrando solo la mesa D^&D de la campana elegida...
"%DND_NODE%" scripts\close-table-on-port.mjs "%DND_SAVE_ROOT%" %DND_PORT% "%DUNGEONS_CAMPAIGN%"
if errorlevel 1 (
  echo.
  echo No se ha cerrado nada automaticamente. Comprueba que elegiste la misma campana que esta abierta.
  pause
  exit /b 1
)
echo.
echo La partida se ha guardado. Preparando la version actualizada...
goto :prepare
exit /b

:choose_campaign
:campaign_choice
  cls
  echo.
  echo   D^&D IMMERSIVE ENGINE
  echo   Elige la campana que vas a dirigir:
  echo.
  echo   [1] Los Dragones de la Isla de las Tempestades ^(aventura y campamentos^)
  echo   [2] D8 Night ^(one-shot privado^)
  echo.
  set "DND_MENU="
  set /P "DND_MENU=Selecciona una campana [1-2]: "
  if "%DND_MENU%"=="1" set "DUNGEONS_CAMPAIGN=stormwreck-isle"
  if "%DND_MENU%"=="2" set "DUNGEONS_CAMPAIGN=d8-night-private"
  if not defined DUNGEONS_CAMPAIGN goto campaign_choice
exit /b
