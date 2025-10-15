[CmdletBinding()]
param(
    [string]$Script = "dev",
    [string[]]$Arguments
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = "Stop"

Push-Location -LiteralPath $PSScriptRoot
try {
    $pnpmArgs = @("run", $Script)
    if ($Arguments) {
        $pnpmArgs += "--"
        $pnpmArgs += $Arguments
    }

    pnpm @pnpmArgs
}
finally {
    Pop-Location
}


