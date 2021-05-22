function Export-UDFramework {
    <#
    .SYNOPSIS
    Exports a framework based on a NPM React package. 
    
    .DESCRIPTION
    Exports a framework based on a NPM React package. Components are exported and accessible within UD.
    
    .PARAMETER Package
    The main package to install. This will be the package used to export components.
    
    .PARAMETER AdditionalPackages
    Any additional packages to install. These components will not be available to UD but my dependencies for the main package.
    
    .PARAMETER Name
    The name of the framework. 
    
    .PARAMETER AdditionalImports
    Additional imports to call within the JavaScript. This may be necessary for importing CSS or images.
    
    .PARAMETER OutputPath
    The output path for the framework. This defaults to an output folder in the current directory. 
    
    .PARAMETER Force
    Whether to overwrite the output directory if it exists.
    
    .PARAMETER Install
    Whether to install this framework to the default framework directory after exporting.
    
    .PARAMETER Version
    The version of the framework. 
    
    .PARAMETER Author
    The author of the framework.
    
    .PARAMETER Description
    The description of the framework.
    
    .EXAMPLE
    Export-UDFramework -Package react-bootstrap -AdditionalPackages bootstrap@4.6.0 -Name bootstrap -AdditionalImports 'bootstrap/dist/css/bootstrap.min.css' -Force -Install
    
    Creates a framework based on React-Bootstrap.

    .NOTES
    General notes
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Package,
        [Parameter()]
        [string[]]$AdditionalPackages,
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter()]
        [string[]]$AdditionalImports,
        [Parameter()]
        [string]$OutputPath = (Join-Path (Get-Location) "output"),
        [Parameter()]
        [Switch]$Force,
        [Parameter()]
        [Switch]$Install,
        [Parameter()]
        [string]$Version = '1.0.0',
        [Parameter()]
        [string]$Author = $Env:USERNAME,
        [Parameter()]
        [string]$Description
    )

    if ($Description -eq $null)
    {
        $Description = "PowerShell Universal Dashboard framework for $Name"
    }

    if ((Test-Path $OutputPath) -and -not $Force)
    {
        throw "$OutputPath already exists. Use -Force to overwrite"
    }

    if (Test-Path $OutputPath)
    {
        Write-Verbose "Output path exists. Removing output"
        Remove-Item $OutputPath -Force -Recurse
    }
    
    New-Item $OutputPath -ItemType Directory | Out-Null
    
    $StagingPath = Join-Path ([IO.Path]::GetTempPath()) $Name
    if (Test-Path $StagingPath) {
        Remove-Item $StagingPath -Force -Recurse
    }

    New-Item $StagingPath -ItemType 'Directory' | Out-Null

    Copy-Item (Join-Path $PSScriptRoot 'framework-template\*') -Destination $StagingPath

    Push-Location $StagingPath

    npm install

    $Imports = ''
    $Imports += "import * as componentList from '$package';`r`n"
    npm install $package --save

    foreach ($addPack in $AdditionalPackages) {
        npm install $addPack --save
    }

    foreach ($import in $AdditionalImports) {
        $Imports += "import '$import';`r`n"
    }

    $Content = Get-Content (Join-Path $StagingPath 'universal-dashboard-service.jsx')
    $Content = $Content.Replace("// Imports", $Imports)

    $Content | Out-File -Force -FilePath (Join-Path $StagingPath 'universal-dashboard-service.jsx')

    Copy-Item (Join-Path $StagingPath 'package.psm1') $OutputPath
    $Parameters = @{
        Path = (Join-Path $OutputPath "$Name.psd1")
        RootModule = "package.psm1"
        Author = $Author
        ModuleVersion = $Version
        Description = $Description
        Tags = @('universal-dashboard', 'ud-framework')
    }
    New-ModuleManifest @Parameters 

    npm run build

    Copy-Item "$StagingPath\output\*" $OutputPath -Recurse

    Pop-Location

    if ($Install)
    {
        Install-UDFramework -Source $OutputPath -Force:$Force -Name $Name
    }
}

function Install-UDFramework {
    <#
    .SYNOPSIS
    Installs an export framework to the default PSU dashboard framework folder.
    
    .DESCRIPTION
    Installs an export framework to the default PSU dashboard framework folder.
    
    .PARAMETER Source
    A source directory containing the framework.
    
    .PARAMETER Name
    Name of the framework
    
    .PARAMETER Force
    Whether to overwrite the framework if it already exists. 
    
    .EXAMPLE
    Install-UDFramework -Source .\myFramework -Name 'MyFramework' -Force

    Installs the framework to the default framework directory. 
    
    .NOTES
    General notes
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Source,
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter()]
        [Switch]$Force
    )

    $Target = "C:\ProgramData\PowerShellUniversal\Dashboard\Frameworks\UniversalDashboard\$Name"
    if ((Test-Path $Target) -and -not $Force)
    {
        throw "$Target already exists. Use -Force to overwrite."
    }

    if (Test-Path $Target)
    {
        Remove-Item $Target -Force -Recurse
    }

    New-Item "C:\ProgramData\PowerShellUniversal\Dashboard\Frameworks\UniversalDashboard\$Name" -ItemType Directory | Out-Null
    Copy-Item "$Source\*" $Target -Recurse
}

function ConvertTo-UDComponent {
    <#
    .SYNOPSIS
    Converts HTML into New-UDComponent calls.
    
    .DESCRIPTION
    Converts HTML into New-UDComponent calls. A string is returned with the converted markup.
    
    .PARAMETER Html
    The HTML to convert.
    
    .EXAMPLE
    "<html test='test'><great><cool></cool></great></html>" | ConvertTo-UDComponent
    
    .NOTES
    General notes
    #>
    param(
        [Parameter(Mandatory, ValueFromPipeline = $true)]
        [string]$InputObject,
        [Parameter()]
        [int]$Depth,
        [Parameter()]
        [Switch]$Dense
    )

    Process {
        try 
        {
            [xml]$Html = $InputObject 
        } catch {
            return Write-UDComponent -Content ('"' + $InputObject +'"') -Depth $Depth
        }
        
        $Element = $Html.FirstChild

        $Str = "New-UDComponent -Type "
        if ($Dense)
        {
            $Str = "c "
        }

        $Component = Write-UDComponent -Content "$str '$($Element.Name)'" -Depth $Depth

        if ($Element.Attributes.Length -gt 0)
        {
            $str = " -Properties"
            if ($Dense)
            {
                $str = " "
            }

            if ($Dense)
            {
                $Component += Write-UDComponent -Content "$str @{ "
            }
            else 
            {
                $Component += Write-UDComponent -Content "$str @{" -NewLine 
            }

            $Element.Attributes.ForEach({
                if ($Dense)
                {
                    $Component += Write-UDComponent -Content ($_.Name + "= '$($_.'#text')'; ")
                }
                else
                {
                    $Component += Write-UDComponent -Content ($_.Name + "= '$($_.'#text')'") -Depth ($Depth + 1) -NewLine
                }
                
            })
            $Component += Write-UDComponent -Content "}" -Depth $Depth
        }

        if ($Element.HasChildNodes)
        {
            $str = " -Content"
            if ($Dense)
            {
                $str = " "
            }
            $Component += Write-UDComponent -Content "$str {" -NewLine
            $Element.ChildNodes.ForEach({
                $Component += ConvertTo-UDComponent -InputObject $_.OuterXML -Depth ($Depth + 1) -Dense:$Dense
            })
            $Component += Write-UDComponent -Content "}" -Depth $Depth
        }

        $Component += "`r`n"
        $Component
    }
}

function Write-UDComponent {
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter()]
        [int]$Depth,
        [Parameter()]
        [Switch]$NewLine
    )

    $sb = [System.Text.StringBuilder]::new()

    if ($Depth -ne 0)
    {
        0..($Depth - 1) | ForEach-Object {
            $sb.Append("`t") | Out-Null
        }
    }

    $sb.Append($Content) | Out-Null
    if ($NewLine)
    {
        $sb.AppendLine() | Out-Null
    }
    $sb.ToString()
}