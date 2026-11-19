param([ValidateSet('pecio','retiro','campamentos')][string]$Project='pecio', [ValidateSet('Test','Capture','Integrated','Rules','PlayerRegression','Regression','AuditCapture','AuditConditions')][string]$Mode='Test', [ValidateSet('before','after')][string]$Phase='after')
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$projectRoot=Join-Path $repoRoot "prototypes/godot-$Project"
$evidence=Join-Path $repoRoot 'output/npc-sprites-20261115'
if($Mode -in @('Regression','AuditCapture','AuditConditions')){$evidence=Join-Path $repoRoot 'output/npc-sprites-audit-20261116'}
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$engine='C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
$script=switch($Mode){'Test'{'res://sprites/test_npcs.gd'} 'Capture'{'res://sprites/capture_npcs.gd'} 'Integrated'{'res://sprites/capture_npc_integrated.gd'} 'Rules'{'res://combat/test_combat_rules.gd'} 'PlayerRegression'{'res://sprites/test_sprites.gd'} 'Regression'{'res://sprites/test_npc_regressions.gd'} 'AuditCapture'{'res://sprites/capture_npc_audit.gd'} 'AuditConditions'{'res://sprites/capture_npcs.gd'}}
$log=Join-Path $evidence ($Project+'-'+$Mode.ToLowerInvariant()+'.log')
if($Mode -eq 'AuditCapture'){$log=Join-Path $evidence ($Project+'-auditcapture-'+$Phase+'.log')}
$arguments=@('--path',('"'+$projectRoot+'"'),'--log-file',('"'+$log+'"'),'--script',$script,'--audio-driver','Dummy','--max-fps','60')
if($Mode -in @('Test','Rules','PlayerRegression','Regression')){$arguments+='--headless'}else{$arguments+=@('--windowed','--resolution','1600x900')}
$port=47980+10*(@('pecio','retiro','campamentos').IndexOf($Project))+(@('Test','Capture','Integrated','Rules','PlayerRegression','Regression','AuditCapture','AuditConditions').IndexOf($Mode))
$arguments+=@('--',('--phase='+$Phase),('--loading-port='+$port),('--destination="'+$evidence.Replace('\','/')+'"'))
$taskAppData=Join-Path $repoRoot "runtime/npc-sprites-appdata/$Project-$Mode"
New-Item -ItemType Directory -Path $taskAppData -Force | Out-Null
$previousAppData=$env:APPDATA
try{$env:APPDATA=$taskAppData;$process=Start-Process -FilePath $engine -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru}finally{$env:APPDATA=$previousAppData}
$deadline=(Get-Date).AddMinutes(8)
while(-not $process.WaitForExit(1000)){
 if(Test-Path -LiteralPath $log){$s=Get-Content -LiteralPath $log -Raw;if($s -match '(?im)^(?:SCRIPT ERROR|ERROR):'){$process.Kill();throw "NPC review stopped: $log"}}
 if((Get-Date) -gt $deadline){$process.Kill();throw "NPC review timed out: $log"}
}
$result=Get-Content -LiteralPath $log -Raw
Write-Host ($result.Split("`n") | Select-Object -Last 10 | Out-String)
if($process.ExitCode -ne 0 -or $result -match '(?im)^(?:SCRIPT ERROR|ERROR):'){throw "NPC review failed: $log"}
