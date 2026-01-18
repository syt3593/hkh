# Deploy preparation script
Write-Host "Building deployment files..." -ForegroundColor Green

# Copy static folder
Write-Host "Copying static assets..."
Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\static" -Recurse -Force

# Copy public folder if exists
if (Test-Path "public") {
    Write-Host "Copying public folder..."
    Copy-Item -Path "public" -Destination ".next\standalone\public" -Recurse -Force
}

# Copy env file
Write-Host "Copying environment variables..."
Copy-Item -Path ".env.local" -Destination ".next\standalone\.env.local" -Force

Write-Host "Done! Upload .next\standalone\ to your server" -ForegroundColor Green
Write-Host "Run: node server.js" -ForegroundColor Yellow
