$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/cases' -UseBasicParsing
$cases = $response.Content | ConvertFrom-Json

Write-Host "Available Cases in System:" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

$cases.data | ForEach-Object {
    Write-Host "$($_.caseReference) - $($_.applicant.firstName) $($_.applicant.lastName) - Complexity: $($_.complexityTier)" -ForegroundColor White
}
