# Setup and Run Script
Write-Host "Setting execution policy..."
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Installing dependencies..."
npm install

Write-Host "Generating test data..."
npm run gen-data

Write-Host "Starting services..."
Write-Host "Bridge API will be at http://localhost:3000"
Write-Host "React frontend will be at http://localhost:5173"
Write-Host ""
npm run dev
