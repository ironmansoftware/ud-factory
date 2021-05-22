$TAType = [psobject].Assembly.GetType('System.Management.Automation.TypeAccelerators')
$TAtype::Add('Endpoint', 'UniversalDashboard.Models.Endpoint')



function New-UDComponent {
    param(
        [Parameter()]
        [string]$Id = [Guid]::NewGuid(),
        [Parameter(Mandatory, Position = 0)]
        [string]$Type,
        [Parameter(Position = 1)]
        [Hashtable]$Properties,
        [Parameter(Position = 2)]
        [scriptblock]$Content
    )

    $c = $null
    if ($Content)
    {
        $c = & $Content
    }

    if ($Properties) {
        $Properties.Keys | ForEach-Object {
            if ($Properties[$_] -is [Endpoint])
            {
                $Properties[$_].Register($Id, $PSCmdlet)
            }
        }
    }

    @{
        id = $Id
        type = $Type 
        properties = $Properties
        content = $c 
    }
}

function New-UDDashboard {
    param(
        [Parameter(Mandatory)]
        [ScriptBlock]$Content
    )

    & $Content
}

function Add-UDElement {
    param(
        [Parameter(Mandatory)]
		[string]$ParentId,
        [Parameter(Mandatory)]
		[ScriptBlock]$Content,
        [Parameter()]
        [Switch]$Broadcast
    )

    $NewContent = & $Content

    $Data = @{
        componentId = $ParentId
        elements = $NewContent
    }

    if ($Broadcast)
    {
        $DashboardHub.SendWebSocketMessage("addElement", $Data)
    }
    else 
    {
        $DashboardHub.SendWebSocketMessage($ConnectionId, "addElement", $Data)
    }    
}

function Clear-UDElement
{
    param(
        [Parameter(Mandatory)]
        [string]$Id,
        [Parameter()]
        [Switch]$Broadcast
    )

    if ($Broadcast)
    {
        $DashboardHub.SendWebSocketMessage("clearElement", $Id)
    }
    else 
    {
        $DashboardHub.SendWebSocketMessage($ConnectionId, "clearElement", $Id)
    }
}

function Get-UDElement 
{
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
		[string]$Id
    )

    $requestId = ''

    $requestId = [Guid]::NewGuid().ToString()

    $Data = @{
        requestId = $requestId 
        componentId = $Id
    }

    $DashboardHub.SendWebSocketMessage($ConnectionId, "requestState", $Data)
    $stateRequestService.Get($requestId)    
}

function Invoke-UDJavaScript
{
    param(
        [Parameter(Mandatory)]
		[string]$JavaScript
    )

    $DashboardHub.SendWebSocketMessage($ConnectionId, "invokejavascript", $JavaScript)
}

function Invoke-UDRedirect
{
    param(
        [Parameter(Mandatory)]
		[string]$Url,
        [Parameter()]
        [Switch]$OpenInNewWindow
    )

    $Data = @{
        url = $Url 
        openInNewWindow = $OpenInNewWindow.IsPresent
    }

    $DashboardHub.SendWebSocketMessage($ConnectionId, "redirect", $Data)
}

function Remove-UDElement
{
    param(
        [Parameter(Mandatory)]
        [string]$Id, 
        [Parameter()]
        [string]$ParentId,
        [Parameter()]
        [Switch]$Broadcast
    )

    $Data = @{
        componentId = $Id 
        parentId = $ParentId
    }

    if ($Broadcast)
    {
        $DashboardHub.SendWebSocketMessage("removeElement", $Data)
    }
    else 
    {
        $DashboardHub.SendWebSocketMessage($ConnectionId, "removeElement", $Data)
    }
}

function Select-UDElement 
{   
    param(
        [Parameter(Mandatory, ParameterSetName = "Normal")]
		[string]$Id,
        [Parameter(ParameterSetName = "Normal")]
        [Switch]$ScrollToElement
    )

    $Data = @{
        id = $Id 
        scrollToElement = $ScrollToElement
    }

    $DashboardHub.SendWebSocketMessage($ConnectionId, "select", $Data)
}

function Set-UDClipboard
{
    param(
        [Parameter(Mandatory)]
		[string]$Data,
        [Parameter()]
        [Switch]$ToastOnSuccess,
        [Parameter()]
        [Switch]$ToastOnError
    )

    $cpData = @{
        data = $Data 
        toastOnSuccess = $ToastOnSuccess.IsPresent
        toastOnError = $ToastOnError.IsPresent
    }

    $DashboardHub.SendWebSocketMessage($ConnectionId, "clipboard", $cpData)
}

function Set-UDElement
{
    param(
        [Parameter(Mandatory)]
        [string]$Id,
        [Alias("Attributes")]
        [Parameter()]
        [Hashtable]$Properties,
        [Parameter()]
        [Switch]$Broadcast,
        [Parameter()]
        [ScriptBlock]$Content
    )

    if ($Content -and -not $Properties)
    {
        $Properties = @{}
    }

    if ($Content)
    {
        $Properties['content'] = [Array](& $Content)
    }

    $Data = @{
        componentId = $Id 
        state = $Properties
    }

    if ($Broadcast)
    {
        $DashboardHub.SendWebSocketMessage("setState", $data)
    }
    else
    {
        $DashboardHub.SendWebSocketMessage($ConnectionId, "setState", $Data)
    }
}

function Sync-UDElement
{
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string[]]$Id,
        [Parameter()]
        [Switch]$Broadcast
    )

    Process 
    {
        foreach($i in $Id) 
        {
            if ($Broadcast)
            {
                $DashboardHub.SendWebSocketMessage("syncElement", $I)
            }
            else
            {
                $DashboardHub.SendWebSocketMessage($ConnectionId, "syncElement", $I)
            }
        } 
    }
}

New-Alias -Name 'c' -Value 'New-UDComponent'