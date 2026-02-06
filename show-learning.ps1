Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  YOUR OVERRIDES ON CASE UW-2024-108' -ForegroundColor Cyan
Write-Host '  (Mahesh Gupta)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan

$overrides = (Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/cases/befb5ef3-7968-4ede-83fa-00bdca859c79/overrides' -UseBasicParsing).Content | ConvertFrom-Json

foreach ($o in $overrides) {
    Write-Host ''
    Write-Host "Override Type: $($o.overrideType)" -ForegroundColor Yellow
    Write-Host "  Direction: $($o.direction)"
    Write-Host "  System Said: $($o.systemRecommendation)"
    Write-Host "  You Changed To: $($o.underwriterChoice)" -ForegroundColor Green
    Write-Host "  Your Reason: $($o.reasoning)" -ForegroundColor Gray
    Write-Host "  Tags: $($o.reasoningTags -join ', ')" -ForegroundColor Gray
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  NOW VIEWING SIMILAR CASE UW-2024-107' -ForegroundColor Cyan
Write-Host '  (Rekha Bose - also has Hypertension)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host 'WHAT THE SYSTEM LEARNED & SHOWS:' -ForegroundColor Yellow
Write-Host ''

$insights = (Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/cases/34ffb93b-cd35-481a-901d-a52d8d070edf/learning-insights' -UseBasicParsing).Content | ConvertFrom-Json

Write-Host "Similar Cases Found: $($insights.similarCasesCount)" -ForegroundColor Green
Write-Host ''
Write-Host 'Override Patterns Detected:' -ForegroundColor Magenta
foreach ($p in $insights.commonOverrides) {
    $pct = [math]::Round($p.frequency * 100)
    Write-Host "  - $($p.type): $pct% of similar cases had overrides"
}
Write-Host ''
Write-Host "ML Confidence Adjustment: $([math]::Round($insights.confidenceAdjustment * 100, 1))%" -ForegroundColor Cyan
Write-Host '  (Negative = System learned to be less confident in its predictions)'
Write-Host ''

Write-Host '----------------------------------------' -ForegroundColor Gray
Write-Host 'SIMILAR CASES & WHAT UNDERWRITERS DID:' -ForegroundColor Yellow
Write-Host '----------------------------------------' -ForegroundColor Gray

$similar = (Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/cases/34ffb93b-cd35-481a-901d-a52d8d070edf/similar?limit=5' -UseBasicParsing).Content | ConvertFrom-Json

foreach ($s in $similar) {
    Write-Host ''
    Write-Host "Case: $($s.caseReference) (Similarity: $($s.similarity)%)" -ForegroundColor Cyan
    Write-Host "  Outcome: $($s.outcome)"
    Write-Host "  Decision: $($s.decision)"
    if ($s.overridesApplied.Count -gt 0) {
        Write-Host '  Overrides by Underwriters:' -ForegroundColor Green
        foreach ($ov in $s.overridesApplied) {
            Write-Host "    * $($ov.type): $($ov.description)"
        }
    } else {
        Write-Host '  No overrides (system recommendation accepted)' -ForegroundColor Gray
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  WHAT THIS MEANS FOR UNDERWRITER' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'When viewing case UW-2024-107 (Rekha Bose), the system shows:' -ForegroundColor White
Write-Host ''
Write-Host '  "Based on 5 similar cases:"' -ForegroundColor Green
Write-Host '  - 40% had complexity tier overrides' -ForegroundColor White
Write-Host '  - 40% had test recommendation changes' -ForegroundColor White
Write-Host '  - Your override on Mahesh Gupta (UW-2024-108) is now part of this learning!' -ForegroundColor Yellow
Write-Host ''
Write-Host 'The underwriter can use this insight to make informed decisions.' -ForegroundColor White
Write-Host ''
