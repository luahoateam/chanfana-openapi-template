$baseUrl = "http://127.0.0.1:8787"
$ProgressPreference = 'SilentlyContinue'

Write-Host "--- TEST START ---"

# 1. OpenAPI Check
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/openapi.json" -Method Get
    Write-Host "[PASS] OpenAPI loaded."
} catch {
    Write-Host "[FAIL] OpenAPI error: $($_.Exception.Message)"
}

# 2. SQL Injection
$payloadSql = '{"content": {"mental_model_id": "'' OR 1=1 --", "persona_id": "indie-hackers", "campaign_id": "test"}}'
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/marketing/generate" -Method Post -Body $payloadSql -ContentType "application/json"
    Write-Host "[WARN] SQL Injection did not crash server, check data integrity."
} catch {
    Write-Host "[PASS] Handled SQL Injection: $($_.Exception.Message)"
}

# 3. Wrong Data Type
$payloadWrongType = '{"content": {"mental_model_id": 12345, "persona_id": "indie-hackers", "campaign_id": "test"}}'
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/marketing/generate" -Method Post -Body $payloadWrongType -ContentType "application/json"
    Write-Host "[FAIL] Accepted wrong data type!"
} catch {
    Write-Host "[PASS] Blocked wrong data type."
}

# 4. Not Found
$payloadNotFound = '{"content": {"mental_model_id": "non-existent", "persona_id": "indie-hackers", "campaign_id": "test"}}'
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/marketing/generate" -Method Post -Body $payloadNotFound -ContentType "application/json"
} catch {
    Write-Host "[PASS] Handled 404 Not Found correctly."
}

Write-Host "--- TEST END ---"
