@echo off
setlocal
cd /d "%~dp0"

set "DND_NODE="
if exist "%ProgramFiles%\nodejs\node.exe" set "DND_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined DND_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "DND_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined DND_NODE for /f "delims=" %%I in ('where node 2^>nul') do if not defined DND_NODE set "DND_NODE=%%I"
if not defined DND_NODE (echo ERROR: Instala Node.js 24.21.0 desde https://nodejs.org/ & pause & exit /b 1)
if not "%DND_NODE:codex-runtimes=%"=="%DND_NODE%" (echo ERROR: Solo se ha encontrado el Node interno de Codex. & echo Instala Node.js 24.21.0 desde https://nodejs.org/ para instalar y ejecutar el juego fuera de Codex. & pause & exit /b 1)
"%DND_NODE%" -e "const [a,b,c]=process.versions.node.split('.').map(Number);process.exit(a===24&&(b>21||(b===21&&c>=0))?0:1)"
if errorlevel 1 (echo ERROR: Se necesita Node.js 24.21.0 o posterior de la rama 24. & pause & exit /b 1)
for %%I in ("%DND_NODE%") do set "DND_NODE_DIR=%%~dpI"

set "DND_PNPM_EXE="
set "DND_PNPM_PREFIX="
if exist "%DND_NODE_DIR%corepack.cmd" (set "DND_PNPM_EXE=%DND_NODE_DIR%corepack.cmd" & set "DND_PNPM_PREFIX=pnpm")
if not defined DND_PNPM_EXE if exist "%DND_NODE_DIR%pnpm.cmd" set "DND_PNPM_EXE=%DND_NODE_DIR%pnpm.cmd"
if not defined DND_PNPM_EXE if exist "%DND_NODE_DIR%npx.cmd" (set "DND_PNPM_EXE=%DND_NODE_DIR%npx.cmd" & set "DND_PNPM_PREFIX=--yes pnpm@11.19.0")
if not defined DND_PNPM_EXE (echo ERROR: La instalacion de Node no incluye corepack, pnpm ni npx. Reinstala Node.js desde https://nodejs.org/. & pause & exit /b 1)

if /I "%~1"=="--check" (
  echo Comprobando el entorno sin instalar ni modificar archivos...
  "%DND_NODE%" -e "const p=require('./package.json');if(p.packageManager!=='pnpm@11.19.0')process.exit(1)"
  if errorlevel 1 (echo ERROR: package.json no fija pnpm 11.19.0. & exit /b 1)
  if not exist "pnpm-lock.yaml" (echo ERROR: Falta pnpm-lock.yaml. & exit /b 1)
  call "%DND_PNPM_EXE%" %DND_PNPM_PREFIX% --version
  if errorlevel 1 (echo ERROR: pnpm no esta disponible. & exit /b 1)
  echo Entorno valido: Node.js 24.21.0+ y proyecto fijado a pnpm 11.19.0.
  exit /b 0
)

echo Instalando dependencias bloqueadas por pnpm-lock.yaml...
call "%DND_PNPM_EXE%" %DND_PNPM_PREFIX% install --frozen-lockfile
if errorlevel 1 (echo ERROR: No se pudieron instalar las dependencias. Comprueba Internet y vuelve a intentarlo. & pause & exit /b 1)

echo Compilando la candidata...
call "%DND_PNPM_EXE%" %DND_PNPM_PREFIX% run build
if errorlevel 1 (echo ERROR: La compilacion ha fallado. & pause & exit /b 1)

echo.
echo Instalacion terminada. Ejecuta INICIAR.cmd para abrir la mesa.
pause
