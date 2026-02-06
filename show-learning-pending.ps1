# Find a pending case to show learning

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/cases' -UseBasicParsing
$cases = $response.Content | ConvertFrom-Json

# Find pending cases (not the one we already overrode)
$pendingCases = $cases.data | Where-Object { $_.status -ne 'completed' -and $_.caseReference -ne 'UW-2024-108' }

if ($pendingCases.Count -eq 0) {
    Write-Host "No other pending cases found. Using UW-2024-106 (Anand Krishnamurthy)" -ForegroundColor Yellow
    $targetCase = $cases.data | Where-Object { $_.caseReference -eq 'UW-2024-106' }
} else {
    $targetCase = $pendingCases[0]
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host "  LEARNING SHOWN ON CASE: $($targetCase.caseReference)" -ForegroundColor Cyan
Write-Host "  Applicant: $($targetCase.applicant.firstName) $($targetCase.applicant.lastName)" -ForegroundColor Cyan
Write-Host "  Status: $($targetCase.status)" -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ""

Write-Host "Current Complexity: $($targetCase.complexityTier) ($([math]::Round($targetCase.complexityConfidence * 100, 1))% confidence)" -ForegroundColor Yellow
Write-Host ""

# Get learning insights for this case
Write-Host "LEARNING INSIGHTS FROM SIMILAR CASES:" -ForegroundColor Green
Write-Host "-------------------------------------" -ForegroundColor Green

try {
    $insights = (Invoke-WebRequest -Uri "http://localhost:3001/api/v1/cases/$($targetCase.id)/learning-insights" -UseBasicParsing).Content | ConvertFrom-Json

    Write-Host "Similar Cases Found: $($insights.similarCasesCount)" -ForegroundColor White
    Write-Host ""

    if ($insights.commonOverrides.Count -gt 0) {
        Write-Host "Override Patterns Detected:" -ForegroundColor Magenta
        foreach ($p in $insights.commonOverrides) {
            $pct = [math]::Round($p.frequency * 100)
            Write-Host "  - $($p.type): $pct% of similar cases had overrides" -ForegroundColor White
        }
    }

    Write-Host ""
    Write-Host "ML Confidence Adjustment: $([math]::Round($insights.confidenceAdjustment * 100, 1))%" -ForegroundColor Cyan
} catch {
    Write-Host "Could not fetch learning insights: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "SIMILAR CASES:" -ForegroundColor Green
Write-Host "--------------" -ForegroundColor Green

try {
    $similar = (Invoke-WebRequest -Uri "http://localhost:3001/api/v1/cases/$($targetCase.id)/similar?limit=5" -UseBasicParsing).Content | ConvertFrom-Json

    foreach ($s in $similar) {
        Write-Host ""
        Write-Host "  $($s.caseReference) (Similarity: $($s.similarity)%)" -ForegroundColor Cyan
        Write-Host "    Decision: $($s.decision)"
        if ($s.overridesApplied.Count -gt 0) {
            Write-Host "    Underwriter Overrides:" -ForegroundColor Yellow
            foreach ($ov in $s.overridesApplied) {
                Write-Host "      * $($ov.type): $($ov.description)"
            }
        }
    }
} catch {
    Write-Host "Could not fetch similar cases: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host '========================================' -ForegroundColor Cyan
Write-Host "  OPEN THIS CASE IN UI:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000/cases/$($targetCase.id)" -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Cyan
