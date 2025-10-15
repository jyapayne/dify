[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string[]]$Targets = @("help")
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = "Stop"

$RepositoryRoot = $PSScriptRoot
if (-not $RepositoryRoot) {
    $RepositoryRoot = (Get-Location).Path
}

function Copy-FileIfMissing {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [string]$ExistsMessage = ""
    )

    if (-not (Test-Path -LiteralPath $Destination)) {
        $destinationDirectory = Split-Path -Parent -Path $Destination
        if ($destinationDirectory -and -not (Test-Path -LiteralPath $destinationDirectory)) {
            New-Item -ItemType Directory -Path $destinationDirectory | Out-Null
        }

        Copy-Item -LiteralPath $Source -Destination $Destination
    }
    elseif ($ExistsMessage) {
        Write-Host $ExistsMessage
    }
}

function Remove-PathIfExists {
    param([Parameter(Mandatory = $true)][string]$Target)

    if (Test-Path -LiteralPath $Target) {
        Remove-Item -LiteralPath $Target -Recurse -Force
    }
}

function Invoke-InDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][scriptblock]$Script
    )

    Push-Location -LiteralPath $Path
    try {
        & $Script
    }
    finally {
        Pop-Location
    }
}

function Invoke-PrepareDocker {
    Write-Host "🐳 Setting up Docker middleware..."
    $dockerDirectory = Join-Path $RepositoryRoot "docker"

    Copy-FileIfMissing `
        -Source (Join-Path $dockerDirectory "middleware.env.example") `
        -Destination (Join-Path $dockerDirectory "middleware.env") `
        -ExistsMessage "Docker middleware.env already exists"

    Invoke-InDirectory -Path $dockerDirectory -Script {
        docker compose -f docker-compose.middleware.yaml `
            --env-file middleware.env `
            -p dify-middlewares-dev up -d
    }

    Write-Host "✅ Docker middleware started"
}

function Invoke-PrepareWeb {
    Write-Host "🌐 Setting up web environment..."
    $webDirectory = Join-Path $RepositoryRoot "web"

    Copy-FileIfMissing `
        -Source (Join-Path $webDirectory ".env.example") `
        -Destination (Join-Path $webDirectory ".env") `
        -ExistsMessage "Web .env already exists"

    Invoke-InDirectory -Path $webDirectory -Script {
        pnpm install
    }

    Write-Host "✅ Web environment prepared (not started)"
}

function Invoke-PrepareApi {
    Write-Host "🔧 Setting up API environment..."
    $apiDirectory = Join-Path $RepositoryRoot "api"

    Copy-FileIfMissing `
        -Source (Join-Path $apiDirectory ".env.example") `
        -Destination (Join-Path $apiDirectory ".env") `
        -ExistsMessage "API .env already exists"

    Invoke-InDirectory -Path $apiDirectory -Script {
        uv sync --dev
        uv run flask db upgrade
    }

    Write-Host "✅ API environment prepared (not started)"
}

function Invoke-DevClean {
    Write-Host "⚠️  Stopping Docker containers..."
    $dockerDirectory = Join-Path $RepositoryRoot "docker"

    Invoke-InDirectory -Path $dockerDirectory -Script {
        docker compose -f docker-compose.middleware.yaml `
            --env-file middleware.env `
            -p dify-middlewares-dev down
    }

    Write-Host "🗑️  Removing volumes..."
    Remove-PathIfExists (Join-Path $dockerDirectory "volumes/db")
    Remove-PathIfExists (Join-Path $dockerDirectory "volumes/redis")
    Remove-PathIfExists (Join-Path $dockerDirectory "volumes/plugin_daemon")
    Remove-PathIfExists (Join-Path $dockerDirectory "volumes/weaviate")
    Remove-PathIfExists (Join-Path $RepositoryRoot "api/storage")

    Write-Host "✅ Cleanup complete"
}

function Invoke-Format {
    Write-Host "🎨 Running ruff format..."
    Invoke-InDirectory -Path $RepositoryRoot -Script {
        uv run --project api --dev ruff format ./api
    }
    Write-Host "✅ Code formatting complete"
}

function Invoke-Check {
    Write-Host "🔍 Running ruff check..."
    Invoke-InDirectory -Path $RepositoryRoot -Script {
        uv run --project api --dev ruff check ./api
    }
    Write-Host "✅ Code check complete"
}

function Invoke-Lint {
    Write-Host "🔧 Running ruff format, check with fixes, and import linter..."
    Invoke-InDirectory -Path $RepositoryRoot -Script {
        uv run --project api --dev ruff format ./api
        uv run --project api --dev ruff check --fix ./api
    }

    Invoke-InDirectory -Path (Join-Path $RepositoryRoot "api") -Script {
        uv run --dev lint-imports
    }

    Write-Host "✅ Linting complete"
}

function Invoke-TypeCheck {
    Write-Host "📝 Running type check with basedpyright..."
    Invoke-InDirectory -Path (Join-Path $RepositoryRoot "api") -Script {
        uv run --dev basedpyright
    }
    Write-Host "✅ Type check complete"
}

function Invoke-BuildWeb {
    $dockerRegistry = $env:DOCKER_REGISTRY
    if (-not $dockerRegistry) {
        $dockerRegistry = "langgenius"
    }

    $image = "$dockerRegistry/dify-web"
    $version = if ($env:VERSION) { $env:VERSION } else { "latest" }

    Write-Host "Building web Docker image: $image:$version..."
    Invoke-InDirectory -Path $RepositoryRoot -Script {
        docker build -t "$image:$version" ./web
    }
    Write-Host "Web Docker image built successfully: $image:$version"
}

function Invoke-BuildApi {
    $dockerRegistry = $env:DOCKER_REGISTRY
    if (-not $dockerRegistry) {
        $dockerRegistry = "langgenius"
    }

    $image = "$dockerRegistry/dify-api"
    $version = if ($env:VERSION) { $env:VERSION } else { "latest" }

    Write-Host "Building API Docker image: $image:$version..."
    Invoke-InDirectory -Path $RepositoryRoot -Script {
        docker build -t "$image:$version" ./api
    }
    Write-Host "API Docker image built successfully: $image:$version"
}

function Invoke-PushWeb {
    $dockerRegistry = $env:DOCKER_REGISTRY
    if (-not $dockerRegistry) {
        $dockerRegistry = "langgenius"
    }

    $image = "$dockerRegistry/dify-web"
    $version = if ($env:VERSION) { $env:VERSION } else { "latest" }

    Write-Host "Pushing web Docker image: $image:$version..."
    docker push "$image:$version"
    Write-Host "Web Docker image pushed successfully: $image:$version"
}

function Invoke-PushApi {
    $dockerRegistry = $env:DOCKER_REGISTRY
    if (-not $dockerRegistry) {
        $dockerRegistry = "langgenius"
    }

    $image = "$dockerRegistry/dify-api"
    $version = if ($env:VERSION) { $env:VERSION } else { "latest" }

    Write-Host "Pushing API Docker image: $image:$version..."
    docker push "$image:$version"
    Write-Host "API Docker image pushed successfully: $image:$version"
}

function Invoke-BuildAll {
    Invoke-BuildWeb
    Invoke-BuildApi
}

function Invoke-PushAll {
    Invoke-PushWeb
    Invoke-PushApi
}

function Invoke-BuildPushAll {
    Invoke-BuildAll
    Invoke-PushAll
    Write-Host "All Docker images have been built and pushed."
}

function Invoke-Help {
    Write-Host "Development Setup Targets:"
    Write-Host "  dev-setup      - Run all setup steps for backend dev environment"
    Write-Host "  prepare-docker - Set up Docker middleware"
    Write-Host "  prepare-web    - Set up web environment"
    Write-Host "  prepare-api    - Set up API environment"
    Write-Host "  dev-clean      - Stop Docker middleware containers"
    Write-Host ""
    Write-Host "Backend Code Quality:"
    Write-Host "  format         - Format code with ruff"
    Write-Host "  check          - Check code with ruff"
    Write-Host "  lint           - Format and fix code with ruff"
    Write-Host "  type-check     - Run type checking with basedpyright"
    Write-Host ""
    Write-Host "Docker Build Targets:"
    Write-Host "  build-web      - Build web Docker image"
    Write-Host "  build-api      - Build API Docker image"
    Write-Host "  build-all      - Build all Docker images"
    Write-Host "  push-all       - Push all Docker images"
    Write-Host "  build-push-all - Build and push all Docker images"
}

$TargetHandlers = @{
    "prepare-docker" = { Invoke-PrepareDocker }
    "prepare-web"    = { Invoke-PrepareWeb }
    "prepare-api"    = { Invoke-PrepareApi }
    "dev-setup"      = {
        Invoke-PrepareDocker
        Invoke-PrepareWeb
        Invoke-PrepareApi
        Write-Host "✅ Backend development environment setup complete!"
    }
    "dev-clean"      = { Invoke-DevClean }
    "format"         = { Invoke-Format }
    "check"          = { Invoke-Check }
    "lint"           = { Invoke-Lint }
    "type-check"     = { Invoke-TypeCheck }
    "build-web"      = { Invoke-BuildWeb }
    "build-api"      = { Invoke-BuildApi }
    "push-web"       = { Invoke-PushWeb }
    "push-api"       = { Invoke-PushApi }
    "build-all"      = { Invoke-BuildAll }
    "push-all"       = { Invoke-PushAll }
    "build-push-all" = { Invoke-BuildPushAll }
    "help"           = { Invoke-Help }
}

foreach ($target in $Targets) {
    $normalized = $target.ToLowerInvariant()
    if (-not $TargetHandlers.ContainsKey($normalized)) {
        Write-Error "Unknown target '$target'. Run 'pwsh -File Makefile.Windows.ps1 help' for available targets."
        exit 1
    }

    & $TargetHandlers[$normalized]
}


