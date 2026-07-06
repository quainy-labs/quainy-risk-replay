param(
  [string]$PackageSpec = $env:QRR_PACKAGE_SPEC,
  [string]$Ref = $env:QRR_REF,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($PackageSpec)) {
  $PackageSpec = "github:quainy-labs/quainy-risk-replay"
}

if (-not [string]::IsNullOrWhiteSpace($Ref) -and -not $PackageSpec.Contains("#")) {
  $PackageSpec = "$PackageSpec#$Ref"
}

if ($env:QRR_DRY_RUN -eq "1") {
  $DryRun = $true
}

Write-Host "Quainy Risk Replay installer"
Write-Host "Package source: $PackageSpec"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 22 or newer is required to run quainy-risk-replay. Install Node.js, then rerun this installer."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required to install quainy-risk-replay."
}

$nodeVersion = (& node --version).Trim()
$nodeMajor = [int]($nodeVersion.TrimStart("v").Split(".")[0])

if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Found: $nodeVersion"
}

Write-Host "Node: $nodeVersion"
Write-Host "npm: $((& npm --version).Trim())"

if ($DryRun) {
  Write-Host "Dry run only. Would run:"
  Write-Host "npm install -g $PackageSpec"
  exit 0
}

& npm install -g $PackageSpec
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Installed quainy-risk-replay."
Write-Host "Next steps:"
Write-Host "  quainy-risk-replay --version"
Write-Host "  cd C:\path\to\your-ai-project"
Write-Host "  quainy-risk-replay init"
Write-Host "  quainy-risk-replay generate"
Write-Host "  quainy-risk-replay run"
Write-Host ""
Write-Host "Note: this installs the CLI only. The showcase web app lives in the Quainy Risk Replay repo checkout."
