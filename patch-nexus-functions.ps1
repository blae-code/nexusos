# patch-nexusos-functions.ps1
# Save to repo root, then run from PowerShell:
#   cd C:\Users\Owner\Desktop\NexusOS\nexusos
#   .\patch-nexusos-functions.ps1

$ErrorActionPreference = 'Stop'
$root = $PWD.Path

$ocrPath     = Join-Path $root "functions\ocrExtract.ts"
$insightPath = Join-Path $root "functions\generateInsight.ts"

foreach ($f in @($ocrPath, $insightPath)) {
    if (-not (Test-Path $f)) {
        Write-Error "Cannot find $f — make sure you are in the repo root."
        exit 1
    }
}

# ─────────────────────────────────────────────
# PATCH 1 — ocrExtract.ts
# ─────────────────────────────────────────────
$ocr = Get-Content $ocrPath -Raw

$ocr = $ocr -replace `
    "const resolvedCallsign = callsign \|\| user\.email;", `
    "const resolvedCallsign = callsign || user.callsign || 'unknown';"

$ocr = $ocr -replace `
    "screenshot_type: \{ type: 'string', enum: \['INVENTORY','MINING_SCAN','REFINERY_ORDER','TRANSACTION'\] \},", `
    "screenshot_type: { type: 'string', enum: ['INVENTORY','MINING_SCAN','REFINERY_ORDER','TRANSACTION','CRAFT_QUEUE','SHIP_STATUS'] },"

$craftShipHandlers = @"

    if (extracted.screenshot_type === 'CRAFT_QUEUE') {
      return Response.json({
        success: true,
        screenshot_type: 'CRAFT_QUEUE',
        pending_confirmation: extracted.items || [],
        message: 'Craft queue detected — confirm before updating queue',
      });
    }

    if (extracted.screenshot_type === 'SHIP_STATUS') {
      return Response.json({
        success: true,
        screenshot_type: 'SHIP_STATUS',
        pending_confirmation: extracted.items?.[0] || {},
        message: 'Ship component state detected — confirm before updating fleet build',
      });
    }
"@

$anchorPattern = "message: 'Mining scan detected — confirm deposit details before logging',"
$anchorReplacement = "message: 'Mining scan detected — confirm deposit details before logging',"
$ocr = $ocr.Replace(
    "message: 'Mining scan detected — confirm deposit details before logging',`n      });`n    }",
    "message: 'Mining scan detected — confirm deposit details before logging',`n      });`n    }$craftShipHandlers"
)

Set-Content $ocrPath $ocr -NoNewline -Encoding UTF8
Write-Host "[OK] ocrExtract.ts patched" -ForegroundColor Green

# ─────────────────────────────────────────────
# PATCH 2 — generateInsight.ts
# ─────────────────────────────────────────────
$insight = Get-Content $insightPath -Raw

$oldSchema = "          action_1_label: { type: 'string' },`n          action_2_label: { type: 'string' },"
$newSchema = "          action_1_label:   { type: 'string' },`n          action_1_prompt:  { type: 'string' },`n          action_2_label:   { type: 'string' },`n          action_2_prompt:  { type: 'string' },"
$insight = $insight.Replace($oldSchema, $newSchema)

$oldInstruction = "Keep the title under 8 words. Keep detail under 25 words. Make it feel like a tactical briefing.`","
$newInstruction = "Keep the title under 8 words. Keep detail under 25 words. Make it feel like a tactical briefing.`n`nReturn action_1_prompt and action_2_prompt as specific, detailed questions a user would ask to act on this insight — they will be sent directly to an assistant as follow-up queries.`","
$insight = $insight.Replace($oldInstruction, $newInstruction)

Set-Content $insightPath $insight -NoNewline -Encoding UTF8
Write-Host "[OK] generateInsight.ts patched" -ForegroundColor Green

# ─────────────────────────────────────────────
# VERIFY
# ─────────────────────────────────────────────
Write-Host "`nVerifying patches..." -ForegroundColor Cyan

$ocrFinal     = Get-Content $ocrPath -Raw
$insightFinal = Get-Content $insightPath -Raw

$checks = @(
    @{ Content=$ocrFinal;     Pattern="user\.callsign \|\| 'unknown'";       Label="ocrExtract.ts      — Fix 1: callsign fallback" },
    @{ Content=$ocrFinal;     Pattern="CRAFT_QUEUE','SHIP_STATUS";            Label="ocrExtract.ts      — Fix 2: enum extended" },
    @{ Content=$ocrFinal;     Pattern="screenshot_type === 'CRAFT_QUEUE'";    Label="ocrExtract.ts      — Fix 3: CRAFT_QUEUE handler" },
    @{ Content=$ocrFinal;     Pattern="screenshot_type === 'SHIP_STATUS'";    Label="ocrExtract.ts      — Fix 3: SHIP_STATUS handler" },
    @{ Content=$insightFinal; Pattern="action_1_prompt";                      Label="generateInsight.ts — Fix 4: action_1_prompt in schema" },
    @{ Content=$insightFinal; Pattern="action_2_prompt";                      Label="generateInsight.ts — Fix 5: action_2_prompt in schema" },
    @{ Content=$insightFinal; Pattern="sent directly to an assistant";        Label="generateInsight.ts — Fix 6: prompt instruction updated" }
)

$allPassed = $true
foreach ($c in $checks) {
    if ($c.Content -match $c.Pattern) {
        Write-Host "  PASS  $($c.Label)" -ForegroundColor Green
    } else {
        Write-Host "  FAIL  $($c.Label)" -ForegroundColor Red
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Host "`nAll 7 checks passed. Committing..." -ForegroundColor Green
    git add functions/ocrExtract.ts functions/generateInsight.ts
    git commit -m "fix: callsign fallback, CRAFT_QUEUE/SHIP_STATUS OCR types, action prompts in insight schema"
    Write-Host "Done. Run 'git push origin main' when ready." -ForegroundColor Cyan
} else {
    Write-Host "`nOne or more checks failed — no commit made. Paste output here for help." -ForegroundColor Red
}
