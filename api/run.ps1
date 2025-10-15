[CmdletBinding()]
param(
    [string]$Host = "0.0.0.0",
    [int]$Port = 5001,
    [switch]$NoDebug
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = "Stop"

Push-Location -LiteralPath $PSScriptRoot
try {
    $venvPath = Join-Path (Get-Location) ".venv"

    if (-not (Test-Path -LiteralPath $venvPath)) {
        Write-Host "Creating uv virtual environment at $venvPath..."
        uv venv --seed
        uv sync --dev
    }

    $activateScript = Join-Path $venvPath "Scripts/Activate.ps1"
    if (-not (Test-Path -LiteralPath $activateScript)) {
        throw "Unable to locate activation script at $activateScript"
    }

    $uvArgs = @(
        "-m",
        "flask",
        "--app", "app",
        "run",
        "--host", $Host,
        "--port", $Port.ToString()
    )

    if (-not $NoDebug.IsPresent) {
        $uvArgs += "--debug"
    }

    . $activateScript
    try {
        & python @uvArgs
    }
    finally {
        if (Get-Command -Name deactivate -ErrorAction SilentlyContinue) {
            deactivate
        }
    }
}
finally {
    Pop-Location
}


