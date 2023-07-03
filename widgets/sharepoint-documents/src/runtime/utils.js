import { InteractionType, PublicClientApplication } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'


export default async function initMsal(props) {

    const scopes = [
        'user.read',
        'profile',
        'Sites.Read.All',
        'Sites.ReadWrite.All'
    ]

    const permissionsUrl = `/sites/${props.siteId}/lists/${props.permissionsListId}/items?expand=fields`

    const msalConfig = {
        auth: {
            clientId: props.clientId,
            authority: `https://login.microsoftonline.com/${props.tenantId}`
        }
    }
    
    const msalInstance = await getMsalInstance(msalConfig)

    let account;
    try {
        account = await getMsalLogin(msalInstance, scopes)
    } catch {
        account = await getMsalConsent(msalInstance, scopes)
    }

    const graphClient = initGraphClient(msalInstance, account, scopes);
    const permissions = {
        write: false,
        read: false,
        delete: false
    }
    await graphClient.api(permissionsUrl).get().then((results) => {
        // field names for Jamestown Sharepoint site. Innovate site uses First and Title
        let user = results.value.find((v) => v.fields.Title === account.name)
        switch (user.fields.PermissionGroup) {
            case "Site Owners":
                permissions.delete = true
            case "Site Member":
                permissions.write = true
            case "Site Visitor":
                permissions.read = true
                break
        }
    })
    let response = {
        graphClient: graphClient,
        permissions: permissions
    }
    return response
}

function initGraphClient(msalInstance, account, scopes) {
    const options = {
        account: account,
        interactionType: InteractionType.Silent, // msal-browser InteractionType
        scopes: scopes
    }
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, options)
    const graphClient = Client.initWithMiddleware({ authProvider });
    return graphClient;
}

async function getMsalLogin(msalInstance, scopes) {
    return msalInstance.ssoSilent({ scopes }).then(r => {
        const account = msalInstance.getAllAccounts()[0]
        msalInstance.setActiveAccount(account)
        return account
    })
}

async function getMsalConsent(msalInstance, scopes) {
    const response = await msalInstance.loginPopup({ scopes })
    return response.account
}

async function getMsalInstance(msalConfig) {
    const msalInstance = new PublicClientApplication(msalConfig)
    return msalInstance
}