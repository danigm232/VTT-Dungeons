$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'maintain-workspace.ps1') -LibraryOnly
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('dungeons-maintenance-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
$passed = 0
function Assert-True($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:passed++
}
function Assert-Refused([scriptblock]$Action, [string]$Message) {
    $refused = $false
    try { & $Action | Out-Null } catch { $refused = $true }
    Assert-True $refused $Message
}
function Write-Fixture([string]$Relative, [string]$Text = 'fixture') {
    $file = Join-Path $fixtureRoot $Relative
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    [IO.File]::WriteAllText($file, $Text)
    return $file
}
function Set-OldTree([string]$Relative) {
    $stamp = [DateTime]::UtcNow.AddDays(-20)
    foreach ($item in @(Get-MaintenanceTree (Join-Path $fixtureRoot $Relative))) {
        $item.CreationTimeUtc = $stamp
        $item.LastWriteTimeUtc = $stamp
    }
}
function Add-Build([string]$Name) {
    Write-Fixture "output/$Name/apps/web/dm.html" '<script src="/assets/app-old.js"></script>' | Out-Null
    Write-Fixture "output/$Name/assets/app-old.js" | Out-Null
    Set-OldTree "output/$Name"
}
try {
    foreach ($name in @('stale', 'recent', 'tracked', 'busy')) { Add-Build $name }
    $recent = Get-Item -LiteralPath (Join-Path $fixtureRoot 'output/recent/assets/app-old.js')
    $recent.CreationTimeUtc = [DateTime]::UtcNow
    $context = [pscustomobject]@{ Root = $fixtureRoot; Cutoff = [DateTime]::UtcNow.Date.AddDays(-7);
        Tracked = @('output/tracked/apps/web/dm.html'); Processes = @('node "' + (Join-Path $fixtureRoot 'output/busy/assets/app-old.js').ToLowerInvariant() + '"') }
    Assert-Refused { Get-MaintenancePath $fixtureRoot $fixtureRoot } 'Must refuse deleting the workspace itself.'
    Assert-Refused { Get-MaintenancePath $fixtureRoot (Split-Path $fixtureRoot -Parent) } 'Must refuse outside paths.'
    $source = Write-Fixture 'campaigns/original.txt'
    Assert-Refused { Get-MaintenancePath $fixtureRoot $source } 'Must refuse source folders.'
    Assert-Refused { Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/recent') } 'A recent descendant protects its entire folder.'
    Assert-Refused { Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/tracked') } 'Tracked files must survive.'
    Assert-Refused { Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/busy') } 'Active absolute paths must survive.'
    $context.Processes = @('node output\busy\assets\app-old.js')
    Assert-Refused { Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/busy') } 'Active relative paths must survive.'
    $old = Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/stale')
    Assert-True ($old.Files.Count -eq 2) 'An old build should be eligible.'
    $context | Add-Member -NotePropertyName PreserveBuildsWithLiveServers -NotePropertyValue $true
    $context.Processes = @('node dist\server\apps\server\index.js')
    Assert-Refused { Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'output/stale') } 'A live server with an implicit web path must protect old builds too.'
    $context.PreserveBuildsWithLiveServers = $false
    $context.Processes = @('node output\busy\assets\app-old.js')
    Assert-True ((Get-MaintenanceTotal @()) -eq 0) 'An empty plan must report zero bytes.'
    New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'runtime/prepared-empty') -Force | Out-Null
    Set-OldTree 'runtime/prepared-empty'
    Assert-True ((Test-MaintenanceTarget $context (Join-Path $fixtureRoot 'runtime/prepared-empty')).Bytes -eq 0) 'An empty stale directory must be handled safely.'
    $linked = Join-Path $fixtureRoot 'output/junction'
    New-Item -ItemType Junction -Path $linked -Target (Join-Path $fixtureRoot 'campaigns') | Out-Null
    Assert-Refused { Get-MaintenancePath $fixtureRoot $linked } 'Junctions must not be traversed.'
    # Remove the junction itself, never its target.
    [IO.Directory]::Delete($linked)
    Assert-True (Test-Path -LiteralPath $source) 'The junction target must survive.'
    Write-Fixture 'output/a1-review/loose.png' | Out-Null
    Write-Fixture 'output/a1-review/keep.png' | Out-Null
    Write-Fixture 'docs/evidence.md' '![keep](../output/a1-review/keep.png)' | Out-Null
    Write-Fixture 'output/a1-review/absolute.png' | Out-Null
    Write-Fixture 'docs/absolute.json' ('{"capture":"' + (Join-Path $fixtureRoot 'output/a1-review/absolute.png').Replace('\', '/') + '"}') | Out-Null
    Write-Fixture 'output/imagegen/original.png' | Out-Null
    Write-Fixture 'output/a1-review/sources/reference.png' | Out-Null
    Set-OldTree 'output/a1-review'
    Set-OldTree 'output/imagegen'
    $plan = New-MaintenancePlan $context
    $paths = @($plan.Candidates | ForEach-Object { $_.Relative })
    Assert-True ($paths -contains 'output/stale') 'The dry run should find old compiled builds.'
    Assert-True ($paths -contains 'output/a1-review/loose.png') 'The dry run should find old unreferenced captures.'
    Assert-True ($paths -notcontains 'output/a1-review/keep.png') 'Documentation-linked captures must survive.'
    Assert-True ($paths -notcontains 'output/a1-review/absolute.png') 'Absolute image references must survive.'
    Assert-True ($paths -notcontains 'output/imagegen/original.png') 'Generated original artwork must not be mistaken for a screenshot.'
    Assert-True ($paths -notcontains 'output/a1-review/sources/reference.png') 'Source material inside a review must survive.'
    Assert-True ($paths -notcontains 'output/recent') 'Recent builds must not be planned.'
    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureRoot 'output/stale')) 'Planning must never delete files.'
    $entry = $plan.Candidates | Where-Object { $_.Relative -eq 'output/stale' }
    $removed = @(Invoke-MaintenanceRemoval $context $entry)
    Assert-True (-not (Test-Path -LiteralPath $entry.Path)) 'Applying the plan should remove the eligible build.'
    Assert-True ($removed.Count -eq 2) 'Every removed file must be recorded.'
    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureRoot 'output/recent/assets/app-old.js')) 'The recent descendant must remain after cleanup.'
    $oldCapture = $plan.Candidates | Where-Object { $_.Relative -eq 'output/a1-review/loose.png' }
    (Get-Item -LiteralPath $oldCapture.Path).LastWriteTimeUtc = [DateTime]::UtcNow
    Assert-Refused { Invoke-MaintenanceRemoval $context $oldCapture } 'A file modified after planning must not be deleted.'
    Assert-True (Test-Path -LiteralPath $oldCapture.Path) 'A changed file must survive the application step.'
    $again = New-MaintenancePlan $context
    Assert-True (@($again.Candidates | Where-Object { $_.Relative -eq 'output/stale' }).Count -eq 0) 'Repeated maintenance must be idempotent.'
    Write-Host "$passed maintenance safety checks passed."
} finally {
    $checkedFixture = (Resolve-Path -LiteralPath $fixtureRoot).ProviderPath
    if ((Split-Path $checkedFixture -Parent) -ne ([IO.Path]::GetTempPath()).TrimEnd('\') -or (Split-Path $checkedFixture -Leaf) -notlike 'dungeons-maintenance-tests-*') { throw 'Unexpected fixture cleanup path.' }
    Remove-Item -LiteralPath $checkedFixture -Recurse -Force
}
