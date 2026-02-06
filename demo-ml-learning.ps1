# ML Learning Demonstration Script
# This script shows how the ML model learns from underwriter overrides

$baseUrl = "http://localhost:3001/api/v1"
$mlUrl = "http://localhost:8000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ML LEARNING FROM OVERRIDES DEMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get current cases
Write-Host "STEP 1: Fetching existing cases..." -ForegroundColor Yellow
$cases = (Invoke-WebRequest -Uri "$baseUrl/cases" -UseBasicParsing).Content | ConvertFrom-Json
$caseCount = $cases.data.Count
Write-Host "Found $caseCount cases in the system" -ForegroundColor Green
Write-Host ""

# Pick first two cases for demo
$case1 = $cases.data[0]
$case2 = $cases.data[1]

Write-Host "Demo Case 1: $($case1.caseReference)" -ForegroundColor Cyan
Write-Host "  - Applicant: $($case1.applicant.firstName) $($case1.applicant.lastName)"
Write-Host "  - Current Complexity: $($case1.complexityTier) (Confidence: $([math]::Round($case1.complexityConfidence * 100, 1))%)"
Write-Host ""

Write-Host "Demo Case 2: $($case2.caseReference)" -ForegroundColor Cyan
Write-Host "  - Applicant: $($case2.applicant.firstName) $($case2.applicant.lastName)"
Write-Host "  - Current Complexity: $($case2.complexityTier) (Confidence: $([math]::Round($case2.complexityConfidence * 100, 1))%)"
Write-Host ""

# Step 2: Check current override count
Write-Host "STEP 2: Checking current override statistics..." -ForegroundColor Yellow
try {
    $stats = (Invoke-WebRequest -Uri "$baseUrl/overrides/stats" -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host "Current override stats:" -ForegroundColor Green
    Write-Host "  - Total overrides: $($stats.totalOverrides)"
    Write-Host "  - By type:"
    $stats.byType.PSObject.Properties | ForEach-Object {
        Write-Host "    - $($_.Name): $($_.Value)"
    }
} catch {
    Write-Host "  No overrides recorded yet" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Create sample overrides (simulating underwriter decisions)
Write-Host "STEP 3: Creating sample overrides (simulating underwriter decisions)..." -ForegroundColor Yellow
Write-Host ""

# Override 1: Upgrade complexity for Case 1
Write-Host "  Override 1: Senior underwriter upgrades complexity..." -ForegroundColor Magenta
$override1Body = @{
    overrideType = "COMPLEXITY_TIER"
    direction = "UPGRADE"
    systemRecommendation = $case1.complexityTier
    systemRecommendationDetails = @{
        originalTier = $case1.complexityTier
        confidence = $case1.complexityConfidence
    }
    systemConfidence = $case1.complexityConfidence
    underwriterChoice = "Complex"
    underwriterChoiceDetails = @{ newTier = "Complex" }
    reasoning = "Patient has multiple comorbidities and borderline test results requiring specialist review"
    reasoningTags = @("multiple_conditions", "borderline_results", "needs_specialist")
    underwriterId = "UW-SENIOR-001"
    underwriterName = "Dr. Priya Sharma"
    underwriterRole = "Senior Underwriter"
    underwriterExperienceYears = 12
} | ConvertTo-Json -Depth 5

try {
    $result1 = Invoke-WebRequest -Uri "$baseUrl/cases/$($case1.id)/overrides" -Method POST -Body $override1Body -ContentType "application/json" -UseBasicParsing
    Write-Host "    Created override: $($case1.complexityTier) -> Complex" -ForegroundColor Green
    Write-Host "    Reason: Multiple comorbidities requiring specialist review" -ForegroundColor Gray
} catch {
    Write-Host "    Override already exists or error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Override 2: Downgrade complexity for Case 2
Write-Host "  Override 2: Experienced underwriter downgrades complexity..." -ForegroundColor Magenta
$override2Body = @{
    overrideType = "COMPLEXITY_TIER"
    direction = "DOWNGRADE"
    systemRecommendation = $case2.complexityTier
    systemRecommendationDetails = @{
        originalTier = $case2.complexityTier
        confidence = $case2.complexityConfidence
    }
    systemConfidence = $case2.complexityConfidence
    underwriterChoice = "Routine"
    underwriterChoiceDetails = @{ newTier = "Routine" }
    reasoning = "Despite flags, all test results are within normal range and condition is well-controlled"
    reasoningTags = @("normal_results", "well_controlled", "low_actual_risk")
    underwriterId = "UW-EXP-002"
    underwriterName = "Rajesh Kumar"
    underwriterRole = "Senior Underwriter"
    underwriterExperienceYears = 8
} | ConvertTo-Json -Depth 5

try {
    $result2 = Invoke-WebRequest -Uri "$baseUrl/cases/$($case2.id)/overrides" -Method POST -Body $override2Body -ContentType "application/json" -UseBasicParsing
    Write-Host "    Created override: $($case2.complexityTier) -> Routine" -ForegroundColor Green
    Write-Host "    Reason: All results normal, condition well-controlled" -ForegroundColor Gray
} catch {
    Write-Host "    Override already exists or error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Override 3: Test recommendation override
Write-Host "  Override 3: Adding test recommendation override..." -ForegroundColor Magenta
$override3Body = @{
    overrideType = "TEST_RECOMMENDATION"
    direction = "ADD"
    systemRecommendation = "No ECG recommended"
    systemRecommendationDetails = @{
        reason = "Age below threshold"
    }
    systemConfidence = 0.7
    underwriterChoice = "Add ECG test"
    underwriterChoiceDetails = @{
        testCode = "ECG"
        testName = "12-Lead ECG"
    }
    reasoning = "Family history of cardiac issues warrants ECG despite age"
    reasoningTags = @("family_history", "cardiac_risk", "preventive")
    underwriterId = "UW-SENIOR-001"
    underwriterName = "Dr. Priya Sharma"
    underwriterRole = "Senior Underwriter"
    underwriterExperienceYears = 12
} | ConvertTo-Json -Depth 5

try {
    $result3 = Invoke-WebRequest -Uri "$baseUrl/cases/$($case1.id)/overrides" -Method POST -Body $override3Body -ContentType "application/json" -UseBasicParsing
    Write-Host "    Created override: Added ECG test" -ForegroundColor Green
    Write-Host "    Reason: Family history of cardiac issues" -ForegroundColor Gray
} catch {
    Write-Host "    Override already exists or error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check updated override statistics
Write-Host "STEP 4: Updated override statistics after underwriter actions..." -ForegroundColor Yellow
$statsAfter = (Invoke-WebRequest -Uri "$baseUrl/overrides/stats" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "Override stats:" -ForegroundColor Green
Write-Host "  - Total overrides: $($statsAfter.totalOverrides)"
Write-Host "  - By type:"
$statsAfter.byType.PSObject.Properties | ForEach-Object {
    Write-Host "    - $($_.Name): $($_.Value)"
}
Write-Host ""

# Step 5: Check ML service status before training
Write-Host "STEP 5: ML Service status BEFORE training..." -ForegroundColor Yellow
$mlHealthBefore = (Invoke-WebRequest -Uri "$mlUrl/health" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "ML Service Health:" -ForegroundColor Green
Write-Host "  - Status: $($mlHealthBefore.status)"
Write-Host "  - Models loaded: $($mlHealthBefore.models_loaded.complexity)"
Write-Host ""

# Step 6: Trigger ML training
Write-Host "STEP 6: Triggering ML model training..." -ForegroundColor Yellow
Write-Host "  This will train models on the override data collected..." -ForegroundColor Gray
try {
    $trainingBody = @{
        model_types = @("complexity", "test_yield")
        force_retrain = $true
    } | ConvertTo-Json

    $trainingResult = Invoke-WebRequest -Uri "$mlUrl/training/trigger" -Method POST -Body $trainingBody -ContentType "application/json" -UseBasicParsing
    $trainingResponse = $trainingResult.Content | ConvertFrom-Json
    Write-Host "  Training triggered!" -ForegroundColor Green
    Write-Host "  Job ID: $($trainingResponse.job_id)" -ForegroundColor Cyan
    Write-Host "  Status: $($trainingResponse.status)" -ForegroundColor Cyan

    # Wait for training
    Write-Host "  Waiting for training to complete..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    # Check training status
    $statusResult = Invoke-WebRequest -Uri "$mlUrl/training/status/$($trainingResponse.job_id)" -UseBasicParsing
    $statusResponse = $statusResult.Content | ConvertFrom-Json
    Write-Host "  Training status: $($statusResponse.status)" -ForegroundColor Cyan

} catch {
    Write-Host "  Training error (this is expected if no training data): $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  The system will continue using deterministic fallback until enough data is collected." -ForegroundColor Gray
}
Write-Host ""

# Step 7: Get learning insights
Write-Host "STEP 7: Learning insights from override patterns..." -ForegroundColor Yellow
try {
    $patterns = (Invoke-WebRequest -Uri "$baseUrl/overrides/patterns" -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host "Override Patterns Detected:" -ForegroundColor Green
    if ($patterns.Count -gt 0) {
        $patterns | ForEach-Object {
            Write-Host "  - Type: $($_.overrideType)" -ForegroundColor Cyan
            Write-Host "    Direction: $($_.direction)"
            Write-Host "    Count: $($_.count)"
            Write-Host "    Common reasons: $($_.topReasons -join ', ')"
            Write-Host ""
        }
    } else {
        Write-Host "  Patterns will emerge as more overrides are recorded" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Patterns endpoint not available: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# Step 8: Show case-specific learning insights
Write-Host "STEP 8: Case-specific learning insights..." -ForegroundColor Yellow
try {
    $insights = (Invoke-WebRequest -Uri "$baseUrl/cases/$($case1.id)/learning-insights" -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host "Learning Insights for $($case1.caseReference):" -ForegroundColor Green
    Write-Host "  - Similar cases found: $($insights.similarCasesCount)"
    Write-Host "  - Override patterns: $($insights.overridePatterns)"
    if ($insights.recommendations) {
        Write-Host "  - Recommendations based on learning:" -ForegroundColor Cyan
        $insights.recommendations | ForEach-Object {
            Write-Host "    * $_"
        }
    }
} catch {
    Write-Host "  Learning insights: System is collecting data for pattern recognition" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEMO COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "KEY TAKEAWAYS:" -ForegroundColor Yellow
Write-Host "1. Underwriter overrides are captured with full context" -ForegroundColor White
Write-Host "2. Override patterns are analyzed to identify trends" -ForegroundColor White
Write-Host "3. ML models can be trained on this feedback data" -ForegroundColor White
Write-Host "4. Future predictions will incorporate learned patterns" -ForegroundColor White
Write-Host ""
Write-Host "To see overrides in the UI:" -ForegroundColor Cyan
Write-Host "  1. Open http://localhost:3000" -ForegroundColor White
Write-Host "  2. Click on a case" -ForegroundColor White
Write-Host "  3. Go to the Risk tab - override complexity" -ForegroundColor White
Write-Host "  4. Go to the Tests tab - add/remove tests" -ForegroundColor White
Write-Host "  5. Each action is recorded for ML learning" -ForegroundColor White
Write-Host ""
