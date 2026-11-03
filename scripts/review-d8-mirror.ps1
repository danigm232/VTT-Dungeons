param([switch]$Build,[ValidateSet('candidate','refinement','artpass','icepass','atmosphere','immersive')][string]$Version='immersive')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $taskRoot
$oldServerBuild = $env:DUNGEONS_SERVER_BUILD
$oldWebDir = $env:DUNGEONS_WEB_DIR
try {
  $reviewBuild = if($Version -eq 'immersive'){'runtime/d8-mirror-immersive-20261020'}elseif($Version -eq 'atmosphere'){'runtime/d8-mirror-seal-atmosphere-20261020'}elseif($Version -eq 'icepass'){'runtime/d8-mirror-icepass-20261020'}elseif($Version -eq 'artpass'){'runtime/d8-mirror-artpass-20261019'}else{"runtime/d8-mirror-$Version"}
  if ($Build) {
    node node_modules/typescript/bin/tsc -p tsconfig.server.json --outDir "$reviewBuild/server"
    if ($LASTEXITCODE -ne 0) { throw 'Server build failed' }
    node node_modules/vite/bin/vite.js build --configLoader runner --outDir "$reviewBuild/web"
    if ($LASTEXITCODE -ne 0) { throw 'Client build failed' }
  }
  if (!(Test-Path -LiteralPath "$reviewBuild/server/apps/server/index.js") -or !(Test-Path -LiteralPath "$reviewBuild/web/apps/web/dm.html")) {
    throw 'Run scripts/review-d8-mirror.ps1 -Build first.'
  }
  $env:DUNGEONS_SERVER_BUILD = "$reviewBuild/server"
  $env:DUNGEONS_WEB_DIR = Join-Path $taskRoot "$reviewBuild/web"
  # A free loopback port and a fresh temporary save folder on every launch.
  node scripts/review-session.mjs
} finally {
  $env:DUNGEONS_SERVER_BUILD = $oldServerBuild
  $env:DUNGEONS_WEB_DIR = $oldWebDir
  Pop-Location
}
