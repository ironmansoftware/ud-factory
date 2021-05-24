# UniversalDashboard.Factory 

Tools for generating custom components and frameworks for PowerShell Universal.

**⚠ This tool is experimental.**

# Requires

- [NodeJS](https://nodejs.org)

# Installation 

```powershell
Install-Module UniversalDashboard.Factory
```

# Frameworks

## Generating a Framework

The following example creates a new framework based on [Ant Design](https://ant.design/).

```powershell
Export-UDFramework -Package 'antd' -Name 'AntDesign' -AdditionalImports 'antd/dist/antd.css'
```

The following example creates a new framework based on [React-Bootsrap](https://react-bootstrap.github.io/).

```powershell
Export-UDFramework -Package react-bootstrap -AdditionalPackages bootstrap@4.6.0 -Name bootstrap -AdditionalImports 'bootstrap/dist/css/bootstrap.min.css'
```

## Installing a Framework

Copy the output from `Export-UDFramework` to the `C:\ProgramData\PowerShellUniversal\UniversalDashboard\Frameworks

## Using a Framework

The framework generated by this tool does not create custom cmdlets but relies on a single `New-UDComponent` cmdlet to create any component in the library. 

```
New-UDComponent -Type 'Layout' -Content {
    New-UDComponent -Type 'Layout.Header' -Content {
        New-UDComponent -Type "Menu" -Properties @{
            mode = "horizontal"
            theme = 'dark'
            onClick = [Endpoint]{ Set-UDElement -Id 'button' -Content { "Cool" } }
        } -Content {
            New-UDComponent -Type "Menu.Item" -Content { "nav1" }
            New-UDComponent -Type "Menu.Item" -Content { "nav2" }
            New-UDComponent -Type "Menu.Item" -Content { "nav3" }
        }
    }
    New-UDComponent -Type 'Layout.Content' -Content {
        New-UDComponent -Type 'Button' -Properties @{
            type = 'primary'
        } -Content {
            "Hey123"
        } -Id 'button'

        New-UDComponent -Type 'Timeline' -Content {
            New-UDComponent -Type 'Timeline.Item' -Content { 'Create a services site 2015-09-01' }
            New-UDComponent -Type 'Timeline.Item' -Content { 'Solve initial network problems 2015-09-01' }
            New-UDComponent -Type 'Timeline.Item' -Content { 'Solve initial network problems 2015-09-01' }
            New-UDComponent -Type 'Timeline.Item' -Content { 'Network problems being solved 2015-09-01' }
        }
        New-UDComponent -Type 'Alert' -Properties @{
            message = 'Success Text'
            type = 'success'
        }
    }
}
```

![](./images/dashboard.png)

## Bootstrap

```
New-UDComponent -Type 'Button' -Content {
    "Hello"
} -Properties @{
    variant = 'primary'
}
```

![](./images/bootstrap.png)

## Benefits

- Generate a new framework with a single command
- Automatically adds support for things like Set-UDElement

## Limitations

There are many limitations to this tool.

- No custom functions for components
- No packaging optimization so large bundle sizes
- Event handlers are currently not working 
- State management hasn't be worked out. 
- Modals and toasts currently don't work

# Convert HTML to UDComponents

Auto-generated frameworks use `New-UDComponent` to create React components. You can use `ConvertTo-UDComponent` to use examples from framework websites and convert them into Universal Dashboard scripts.

```html
'<Alert variant="success">
  <Alert.Heading>Hey, nice to see you</Alert.Heading>
  <p>
    Aww yeah, you successfully read this important alert message. This example
    text is going to run a bit longer so that you can see how spacing within an
    alert works with this kind of content.
  </p>
  <hr />
  <p className="mb-0">
    Whenever you need to, be sure to use margin utilities to keep things nice
    and tidy.
  </p>
</Alert>' | ConvertTo-UDComponent
```

The resulting script would look like this.

```powershell
New-UDComponent -Type 'Alert' -Properties @{
        variant= 'success'
} -Content {
        New-UDComponent -Type 'Alert.Heading' -Content {
                "Hey, nice to see you"
        }
        New-UDComponent -Type 'p' -Content {
                "
    Aww yeah, you successfully read this important alert message. This example
    text is going to run a bit longer so that you can see how spacing within an
    alert works with this kind of content.
  "
        }
        New-UDComponent -Type 'hr'
        New-UDComponent -Type 'p' -Properties @{
                className= 'mb-0'
        } -Content {
                "
    Whenever you need to, be sure to use margin utilities to keep things nice
    and tidy.
  "
        }
}
```

If you specify the `-Dense` parameter, you can also generate script that uses aliases and position parameters. 

```powershell
c  'Alert'  @{ variant= 'success'; }  {
        c  'Alert.Heading'  {
                "Hey, nice to see you"  }
        c  'p'  {
                "
    Aww yeah, you successfully read this important alert message. This example
    text is going to run a bit longer so that you can see how spacing within an
    alert works with this kind of content.
  "     }
        c  'hr'
        c  'p'  @{ className= 'mb-0';   }  {
                "
    Whenever you need to, be sure to use margin utilities to keep things nice
    and tidy.
  "     }
}
```