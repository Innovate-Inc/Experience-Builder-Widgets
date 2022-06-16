import {
  React,
  utils,
  DataSource,
  DataSourceComponent,
  AllWidgetProps,
  DataSourceStatus,
  IMDataSourceInfo,
  ExpressionResolverComponent
} from 'jimu-core'
import Query from 'esri/tasks/support/Query'
import {Client, FileUpload, LargeFileUploadTask} from '@microsoft/microsoft-graph-client'
import {InteractionType, PublicClientApplication} from '@azure/msal-browser'
import {
  AuthCodeMSALBrowserAuthenticationProvider,
  AuthCodeMSALBrowserAuthenticationProviderOptions
} from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'
import {ListItem} from './listItem'
import {v4 as uuidv4} from 'uuid';
import VirtualScroll from './virtualScroll';
import {QueryClient, QueryClientProvider} from 'react-query';
import {Loading} from 'jimu-ui';

interface State {
  profile: any,
  initialized: boolean,
  msalToken: string,
  newListItem: any,
  count: number,
  selectedObjects: any[],
  graphClient: any,
  selectionId: string
}

export default class Widget extends React.PureComponent<AllWidgetProps<unknown>, State> {
  state = {
    profile: null,
    newListItem: null,
    count: 0,
    selectedObjects: [],
    selectionId: null,
    initialized: false
  }
  msalInstance;
  graphClient;
  loginRequest = {scopes: ['user.read', 'profile', 'Sites.Read.All', 'Sites.ReadWrite.All']};
  profile;

  re = /{(.*)}/;

  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  flatDataSources = {}
  renderExpression(parts, attributes) {
    return parts.map(part => {
      if (part.type === 'FIELD') {
        return attributes[part.jimuFieldName]
      }
      if (part.type === 'OPERATOR') {
        return ''
      }
      if (part.type === 'STRING') {
        return part.exp.replaceAll('"', '')
      }

    })
  }
  componentDidUpdate(prevProps: AllWidgetProps<unknown>) {
    console.log('componentDidUpdate')
    if (this.props.stateProps?.selectionId !== undefined && this.props.stateProps.selectionId !== this.state.selectionId) {
      this.setState({
        selectedObjects: this.props.stateProps.selectedObjects.map(o => {

          o.LABEL = this.flatDataSources[o.DATASOURCE_ID].expression
            ? this.renderExpression(
            this.flatDataSources[o.DATASOURCE_ID].expression.parts,
            o.attributes) : o.attributes[o.DEFAULT_LABEL_FIELD]

          return o
        }),
        selectionId: this.props.stateProps.selectionId
      })

    }
  }

  // shouldComponentUpdate(nextProps, nextState) {
  //   console.log('shouldComponentUpdate')
  //   // console.log(nextProps, nextState);
  //   // if (this.props.state === 'CLOSED' && nextProps.state !== 'CLOSED') {
  //   //   return true;
  //   // }
  //   // return this.state.globalIds !== nextState.globalIds;
  //   // this doesn't work in list view as window... is it still needed b/c of changes to virtual scroll component?
  //   // if (this.props.stateProps) {
  //   //   return this.props.stateProps?.selectionId !== nextProps.stateProps?.selectionId
  //   // }
  //   return true;
  // }

  componentDidMount() {
    console.log('componentDidMount')
    this.props.useDataSources.forEach(ds => {
      this.flatDataSources[ds.dataSourceId] = ds
      if (ds.expression) {
        this.expression = ds.expression
      }
    })
    this.initMsal().then(() => {
      this.setState({initialized: true});
    }
  }


  async initMsal() {
    if (!this.state.initialized) {
      this.setMsalConfig()
    }
    let account
    try {
      account = await this.msalLogin()
    } catch {
      account = await this.getMsalConcent()
    }
    this.initGraphClient(account)
  }

  // isDsConfigured = () => {
  //   if (this.props.useDataSources &&
  //     this.props.useDataSources.length === 1 &&
  //     this.props.useDataSources[0].fields &&
  //     this.props.useDataSources[0].fields.length === 1) {
  //     return true;
  //   }
  //   return false;
  // }

  setMsalConfig() {
    const msalConfig = {
      auth: {
        clientId: this.props.clientId,
        authority: `https://login.microsoftonline.com/${this.props.tenantId}`
      }
    }
    this.msalInstance = new PublicClientApplication(msalConfig)
  }

  initGraphClient(account) {
    const options: AuthCodeMSALBrowserAuthenticationProviderOptions = {
      account: account, // the AccountInfo instance to acquire the token for.
      interactionType: InteractionType.Silent, // msal-browser InteractionType
      scopes: this.loginRequest.scopes
    }
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(this.msalInstance, options)
    this.graphClient = Client.initWithMiddleware({authProvider});
    return this.graphClient;
  }

  async getMsalConcent() {
    console.log('failed.. getting consent')
    const response = await this.msalInstance.loginPopup(this.loginRequest)
    console.log('consent complete')
    return response.account
  }

  msalLogin() {
    return this.msalInstance.ssoSilent(this.loginRequest).then(r => {
      const account = this.msalInstance.getAllAccounts()[0]
      this.msalInstance.setActiveAccount(account)
      return account
    })
  }

  //
  // async setMsalToken () {
  //   const tokenResponse = await this.msalInstance.acquireTokenSilent(this.loginRequest)
  //   this.setState({ msalToken: tokenResponse.accessToken })
  // }

  // for testing
  // getUserProfile = (e) => {
  //     // fetch('https://graph.microsoft.com/v1.0/me', {
  //     //     headers: {
  //     //         Authorization: `Bearer ${this.state.msalToken}`
  //     //     }
  //     // }).then(r => r.json()).then(profile => {
  //     //     this.setState({profile});
  //     // });
  //     this.graphClient.api('me').get().then(profile => this.setState({profile}))
  // }


  uploadFile(file) {
    if (file.size > 4 * 1024 * 1024) {
      return this.multipartUpload(file)
    } else {
      return this.graphClient
        .api(`${this.props.driveItemRootUrl}/${this.props.driveItemRootId}:/${uuidv4()}/${file.name}:/content`)
        .put(file)
    }
  }


  async multipartUpload(file) {
    const session = await LargeFileUploadTask.createUploadSession(
      this.graphClient,
      `${this.props.driveItemRootUrl}/${this.props.driveItemRootId}:/${uuidv4()}/${file.name}:/createUploadSession`);

    const f = new FileUpload(
      file,
      file.name,
      file.size
    )
    const task = new LargeFileUploadTask(this.graphClient, f, session);
    const results = await task.upload();
    return results.responseBody;
  }

  fileInputChanged = async (e) => {
    const file = e.target.files[0]
    const driveItem = await this.uploadFile(file)
    const newListItem = await this.getDriveItemListItem(driveItem)
    this.createRelationshipListItems(newListItem.id);
    this.setState({newListItem});
    e.target.value = null
  }

  getDriveItemListItem(driveItem) {
    return this.graphClient.api(`${this.props.driveItemRootUrl}/${driveItem.id}/listItem`).get()
  }

  createRelationshipListItems(DocumentFKLookupId) {
    this.state.selectedObjects.forEach(i => {
      // const itemId = this.re.exec()[1];
      const RecordFK = i.UNIQUE_ID;
      return this.graphClient.api(`${this.props.relationshipListUrl}/items`).post(
        {
          fields: {
            RecordFK,
            DocumentFKLookupId
          }
        }
      )
    })
  }


  render() {
    // if (!this.isDsConfigured()) {
    //   return <h3>
    //     Please config data source.
    //   </h3>;
    // }
    if (!this.state.initialized) {
      return <Loading type='SECONDARY'/>
    }

    return <QueryClientProvider client={this.queryClient} contextSharing={true}>
      <div className="widget-subscribe" style={{
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        backgroundColor: 'white'
      }}>
        {/*<div style={{*/}
        {/*  height: '100%',*/}
        {/*  overflowY: 'auto',*/}
        {/*  overflowX: 'hidden'*/}
        {/*}}>*/}
        {this.state.selectedObjects.length === 0

          ? <h5>Click on item see related documents</h5>
          : <h5>Currently viewing documents for {this.state.selectedObjects.length} sites.</h5>}


        {this.state.selectedObjects.length > 0
          ? <VirtualScroll graphClient={this.graphClient} listUrl={this.props.listUrl}
                             relationshipListUrl={this.props.relationshipListUrl}
                             selectedObjects={this.state.selectedObjects}
                            selectionId={this.state.selectionId}
                             addedItem={this.state.newListItem}></VirtualScroll>
            : null}
        {this.state.selectedObjects.length > 0
          ? <div>
            <hr></hr>
            Select a file to upload to the selected site(s).<br/>
            <input style={{minHeight: '26px'}} type="file" onChange={this.fileInputChanged}/>
          </div>
          : null}
        {/*</div>*/}
      </div>

    </QueryClientProvider>
  }
}
