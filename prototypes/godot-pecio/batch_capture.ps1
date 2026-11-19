$godot = "C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe"
$modes = @(
    "--capture-foundations-after",
    "--capture-ocean-breakers",
    "--capture-zone-c1-main",
    "--capture-zone-c2-forecastle",
    "--capture-zone-c3-poop",
    "--capture-zone-c4-captain",
    "--capture-zone-c5-galley",
    "--capture-zone-c6-crew",
    "--capture-zone-c7-mess",
    "--capture-zone-c8-bilge",
    "--capture-zone-c9-hold",
    "--capture-zone-c10-crowsnest",
    "--capture-doors-open",
    "--capture-inventory-backpack",
    "--capture-cofa-climb"
)

foreach ($m in $modes) {
    Write-Host "Ejecutando: $m..."
    & $godot --path "prototypes\godot-pecio" $m
    Start-Sleep -Milliseconds 600
}
Write-Host "BATCH_CAPTURES_COMPLETADO_EXITOSAMENTE"
