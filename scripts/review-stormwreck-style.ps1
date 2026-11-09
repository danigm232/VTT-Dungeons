param([switch]$Build)
$ErrorActionPreference='Stop'
$reviewRoot=Split-Path -Parent $PSScriptRoot
$reviewBuild='runtime/stormwreck-zone-finish-20261105'
$previousStyle=$env:DUNGEONS_STYLE_SAMPLE
$previousServer=$env:DUNGEONS_SERVER_BUILD
$previousWeb=$env:DUNGEONS_WEB_DIR
$previousCampaign=$env:DUNGEONS_CAMPAIGN
Push-Location -LiteralPath $reviewRoot
try {
 if($Build -or !(Test-Path -LiteralPath "$reviewBuild/server/apps/server/index.js") -or !(Test-Path -LiteralPath "$reviewBuild/web/apps/web/dm.html")){
  $env:DUNGEONS_STYLE_SAMPLE='1'
  node node_modules/vite/bin/vite.js build --configLoader runner --outDir "$reviewBuild/web" --emptyOutDir false
  if($LASTEXITCODE -ne 0){throw 'No se pudo compilar el cliente de revision.'}
  node node_modules/typescript/bin/tsc -p tsconfig.server.json --outDir "$reviewBuild/server"
  if($LASTEXITCODE -ne 0){throw 'No se pudo compilar el servidor de revision.'}
 }
 $env:DUNGEONS_SERVER_BUILD="$reviewBuild/server"
 $env:DUNGEONS_WEB_DIR=Join-Path $reviewRoot "$reviewBuild/web"
 $env:DUNGEONS_CAMPAIGN='stormwreck-isle'
 Write-Host 'Retiro y Pecio: acabado por zonas del 05/11/2026. Partida temporal de revision.'
 Write-Host 'Se mostraran los enlaces DM, jugador y proyector. Escribe quit para cerrar.'
 node scripts/review-session.mjs
} finally {
 $env:DUNGEONS_STYLE_SAMPLE=$previousStyle
 $env:DUNGEONS_SERVER_BUILD=$previousServer
 $env:DUNGEONS_WEB_DIR=$previousWeb
 $env:DUNGEONS_CAMPAIGN=$previousCampaign
 Pop-Location
}
