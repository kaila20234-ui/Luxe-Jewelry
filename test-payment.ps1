# Test payment flow
$body = @{
    email='testorder@example.com'
    name='Test Order'
    phone='+2348000000000'
    address='Test Address, Lagos'
    items=@(@{
        name='Diamond Ring'
        price=5000
        qty=1
        _id='507f1f77bcf86cd799439011'
    })
    amount=5250
} | ConvertTo-Json -Depth 5

Write-Host "Step 1: Creating payment session..."
$session = Invoke-RestMethod -Uri http://localhost:5000/api/pay-now -Method Post -Body $body -ContentType 'application/json'
Write-Host "Session ID: $($session.sessionId)`n"

Start-Sleep -Seconds 1

Write-Host "Step 2: Initializing Paystack payment..."
$payInit = Invoke-RestMethod -Uri http://localhost:5000/api/pay -Method Post -Body (@{sessionId=$session.sessionId} | ConvertTo-Json) -ContentType 'application/json'
Write-Host "Reference: $($payInit.reference)"
Write-Host "Authorization URL: $($payInit.url.Substring(0,60))...`n"

Start-Sleep -Seconds 2

Write-Host "Step 3: Checking if order exists (should not yet)..."
$verify = Invoke-RestMethod -Uri "http://localhost:5000/api/verify-payment?reference=$($payInit.reference)" -Method Get -ContentType 'application/json' -ErrorAction SilentlyContinue

if ($verify.success) {
    Write-Host "Order found (webhook fired): $($verify.sale.email)"
} else {
    Write-Host "Order not found (webhook hasn't fired yet - this is expected)"
}

Write-Host "`nTest complete!"
