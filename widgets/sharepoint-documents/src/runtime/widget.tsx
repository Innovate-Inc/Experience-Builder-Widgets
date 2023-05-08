/* eslint-disable */

import {
  React,
  utils,
  DataSource,
  DataSourceComponent,
  AllWidgetProps,
  DataSourceStatus,
  IMDataSourceInfo,
  ExpressionResolverComponent,
} from 'jimu-core'
import { Client, FileUpload, LargeFileUploadTask } from '@microsoft/microsoft-graph-client'
import { InteractionType, PublicClientApplication } from '@azure/msal-browser'
import {
  AuthCodeMSALBrowserAuthenticationProvider,
  AuthCodeMSALBrowserAuthenticationProviderOptions
} from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'
import { v4 as uuidv4 } from 'uuid';
import VirtualScroll from './virtualScroll';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Loading, Row, Col } from 'jimu-ui';
import { CalcitePanel, CalciteInput, CalciteButton } from 'calcite-components'


interface State {
  profile: any,
  initialized: boolean,
  msalToken: string,
  newListItem: any,
  count: number,
  selectedObjects: any[],
  graphClient: any,
  selectionId: string,
  account: any,
  permissions: {},
  listUrl: string,
  relationshipListUrl: string,
  driveItemRootUrl: string,
  sessionUploads: any[],
  searchText: string
}

export default class Widget extends React.PureComponent<AllWidgetProps<unknown>, State> {
  state = {
    profile: null,
    newListItem: null,
    count: 0,
    selectedObjects: [],
    selectionId: null,
    initialized: false,
    account: null,
    permissions: null,
    sessionUploads: [],
    searchText: ''
  }
  msalInstance;
  graphClient;
  loginRequest = { scopes: ['user.read', 'profile', 'Sites.Read.All', 'Sites.ReadWrite.All'] };
  profile;
  account;

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

  componentDidMount() {
    this.props.useDataSources.forEach(ds => {
      this.flatDataSources[ds.dataSourceId] = ds
      if (ds.expression) {
        this.expression = ds.expression;
      }
    })
    this.initMsal().then(() => {
      this.setState({ initialized: true });
    })
    if (this.props.config.siteId && this.props.config.listId) {
      this.setState({
        listUrl: `/sites/${this.props.config.siteId}/lists/${this.props.config.listId}`
      })
    }
    if (this.props.config.siteId && this.props.config.relationshipListId) {
      this.setState({
        relationshipListUrl: `/sites/${this.props.config.siteId}/lists/${this.props.config.relationshipListId}`
      })
    }
    // console.log(this.props.config)
    if (this.props.config.siteId && this.props.config.driveId && this.props.config.driveItemRootId) {
      this.setState({
        driveItemRootUrl: `/sites/${this.props.config.siteId}/drives/${this.props.config.driveId}/items`
      })
    }
  }


  async getUserPermissions(userName, permissionsListId) {
    let writePerms = false;
    let readPerms = false;
    let deletePerms = false;
    let urlArray = this.state.driveItemRootUrl.split('/');
    let siteUrl = `/sites/${urlArray[2]}`;
    await this.graphClient.api(`${siteUrl}/lists/${permissionsListId}/items?expand=fields`).get().then((results) => {
      results.value.forEach((v) => {
        // field names for Jamestown Sharepoint site. Innovate site uses First and Title
        if (v.fields.Title === userName) {
          if (v.fields.PermissionGroup === 'Site Owners') {
            readPerms = true;
            writePerms = true;
            deletePerms = true;
          } else if (v.fields.PermissionGroup === 'Site Member') {
            readPerms = true;
            writePerms = true;
            deletePerms = false;
          } else if (v.fields.PermissionGroup === 'Site Visitor') {
            readPerms = true;
            writePerms = false;
            deletePerms = false;
          }
        }
      });
    })
    this.setState({
      permissions: {
        read: readPerms,
        write: writePerms,
        delete: deletePerms
      }
    })
  }

  async initMsal() {
    if (!this.state.initialized) {
      this.setMsalConfig()
    }
    let account;
    try {
      account = await this.msalLogin()
    } catch {
      account = await this.getMsalConsent()
    }
    this.setState({ account: account });
    this.initGraphClient(account);
    await this.getUserPermissions(this.state.account.name, this.props.config.permissionsListId);
  }

  setMsalConfig() {
    const msalConfig = {
      auth: {
        clientId: this.props.config.clientId,
        authority: `https://login.microsoftonline.com/${this.props.config.tenantId}`
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
    this.graphClient = Client.initWithMiddleware({ authProvider });
    return this.graphClient;
  }

  async getMsalConsent() {
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

  uploadFile(file) {
    if (file.size > 4 * 1024 * 1024) {
      return this.multipartUpload(file)
    } else {
      return this.graphClient
        .api(`${this.state.driveItemRootUrl}/${this.props.config.driveItemRootId}:/${uuidv4()}/${file.name}:/content`)
        .put(file)
    }
  }


  async multipartUpload(file) {
    const session = await LargeFileUploadTask.createUploadSession(
      this.graphClient,
      `${this.state.driveItemRootUrl}/${this.props.config.driveItemRootId}:/${uuidv4()}/${file.name}:/createUploadSession`);

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
    this.createRelationshipListItems(newListItem);
    this.setState({ newListItem });
    e.target.value = null
  }

  getDriveItemListItem(driveItem) {
    return this.graphClient.api(`${this.state.driveItemRootUrl}/${driveItem.id}/listItem`).get()
  }

  createRelationshipListItems(newListItem) {
    const DocumentFKLookupId = newListItem.id
    let newSessionUploads = []
    this.state.selectedObjects.forEach(i => {
      const RecordFK = i.UNIQUE_ID;
      let upload = {
        recordId: RecordFK,
        document: newListItem
      }
      newSessionUploads.push(upload)
      return this.graphClient.api(`${this.state.relationshipListUrl}/items`).post(
        {
          fields: {
            RecordFK,
            DocumentFKLookupId
          }
        }
      )
    })
    this.setState({
      sessionUploads: this.state.sessionUploads.concat(newSessionUploads)
    })
  }

  updateSearchInput(evt) {
    let value = ''
    if (evt.target && evt.target.parentElement && evt.target.parentElement.value) {
      value = evt.target.parentElement.value
    }
    return value;
  }


  render() {
    // console.log(this.state)
    if (!this.state.initialized) {
      return <Loading type='SECONDARY' />
    }

    return <QueryClientProvider client={this.queryClient} contextSharing={true}>
      <CalcitePanel
        style={{
          height: '100%',
          maxHeight: '100%',
        }}
        heading='Parcel Document Management'
      >
        <div className="m-2">
          {this.state.permissions.read === true ? 
            "Select a feature on the map or in the table to view documents related to that feature. You can also filter by file name." :
            "You do not currently have access the sharepoint document library. Please contact your sharepoint administrator"
          }
        </div>
        
        {this.state.permissions.read === true ? 
          <div>
            <Row className="m-2 p-0">
              <Col className="col-12 m-0 p-0">
                <CalciteInput placeholder="Filter by file name" type="search">
                  <CalciteButton
                    slot="action"
                    title="Search"
                    className="px-2"
                    onClick={(evt) => {
                      let value = this.updateSearchInput(evt)
                      this.setState({
                        searchText: value
                      })
                    }}
                  >
                    Search
                  </CalciteButton>
                </CalciteInput>
              </Col>
              {/* <Col className="col-4 m-0 p-0">
                <CalciteButton
                  title="Search"
                  className="px-2"
                  // onClick={remove(document)}
                >
                  Search
                </CalciteButton>
              </Col> */}
            </Row>
            {this.state.selectedObjects.length > 0 ?
              <Row className="m-2 p-0">
                {`Currently viewing documents for ${this.state.selectedObjects.length} sites.`}
              </Row>
              : null
            }
          </div>
          : null
        }
        {this.state.permissions.read === true
          ? this.state.selectedObjects.length > 0
            ? <VirtualScroll graphClient={this.graphClient} listUrl={this.state.listUrl}
              relationshipListUrl={this.state.relationshipListUrl}
              selectedObjects={this.state.selectedObjects}
              selectionId={this.state.selectionId}
              // addedItem={this.state.newListItem}
              sessionUploads={this.state.sessionUploads}
              deleteAccess={this.state.permissions.delete}
              searchText={this.state.searchText}
            />
            : null
          : null
        }

        <div slot="footer" style={{
          width: "100%"
        }}>
          {this.state.permissions.write === true
            ? this.state.selectedObjects.length > 0
              ?
                <div>
                  Select a file to upload to the selected site(s).<br />
                  <input style={{ minHeight: '26px' }} type="file" onChange={this.fileInputChanged} />
                </div>
              : null
            : 'Write access required to upload documents.'
          }
        </div>
      </CalcitePanel>
    </QueryClientProvider>
  }
}
