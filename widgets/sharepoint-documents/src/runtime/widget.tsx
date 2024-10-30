import { React, AllWidgetProps, DataSourceComponent, DataSourceManager, SessionManager, getAppStore, DataRecord, DataSource, Expression, UseDataSource } from 'jimu-core'
import { Navbar, Nav, NavItem, ButtonGroup, Button, Container, Row } from 'jimu-ui'
import { AddPageOutlined } from 'jimu-icons/outlined/editor/add-page'
// import { RightOutlined } from 'jimu-icons/outlined/directional/right'
import initMsal from './utils'
import FeatureCard from './featureCard'
import UploadModal from './uploadModal'
import InfoModal from './infoModal'
import DeleteModal from './deleteModal'
import DocumentSearchForm from './documentSearchForm'
import DocumentList from './documentList'
import EditRelationshipModal from './editRelationshipsModal'
import { Client } from '@microsoft/microsoft-graph-client'
import { SqlQueryParams } from 'jimu-core'

interface UseDataSourceModified extends UseDataSource {
  dataSource: DataSource
  expression: Expression
}

interface SharepointCreator {
  email: string
  id: string
  displayName: string
}

interface SharepointDocument {
  fields: {
    Title: string
    LinkFileName: string
    Tags: string[]
    FeatureFKs: string[]
    DocumentDescription: string
  }
  webUrl: string
  createdBy: {
    user: SharepointCreator
  }
  createdDateTime: string
  id: string
}

interface SharepointFilters {
  tags: string[]
  startDate: string | null
  endDate: string | null
  searchText: string | null
  creators: string[]
}

export default class Widget extends React.PureComponent<AllWidgetProps<any>, any> {
  constructor (props: AllWidgetProps<any>) {
    super(props)
    this.state = {
      dataSourceManager: null,
      listUrl: '',
      driveItemRootUrl: '',
      graphClient: null,
      permissions: {
        write: false,
        read: false,
        delete: false
      },
      selectedFeatures: {},
      documents: [],
      uploading: false,
      documentTags: [],
      creatorList: [],
      infoModalDocument: null,
      deletingDocument: null,
      editRelationshipDoc: null,
      searchAllDocuments: false,
      documentFilters: {
        tags: [],
        startDate: null,
        endDate: null,
        searchText: '',
        creators: []
      },
      useDataSources: [],
      validSettings: false,
      query: {
        outFields: ['*']
      }
    }
  };

  static getDerivedStateFromProps (props: {[key: string]: any}) {
    return {
      useDataSources: props.config.useDataSources
    }
  };

  getDataSource(ds: UseDataSource) {
    const dataSource = this.state.dataSourceManager.getDataSource(ds.dataSourceId)
    return dataSource
  }

  getSelectedFeatures (ds) {
    if (ds) {
      const dataSource = this.getDataSource(ds)
      if (dataSource && dataSource.getSelectedRecords()) {
        const selectedFeatures = dataSource.getSelectedRecords()
        this.setState((prevState: {[key: string]: any}) => {
          const newSelectedFeatures = { ...prevState.selectedFeatures }
          const dsId = ds.dataSourceId
          if (dsId) {
            newSelectedFeatures[dsId] = selectedFeatures
          }
          return {
            selectedFeatures: newSelectedFeatures
          }
        })
      }
    }
  };

  deselectFeature (r: DataRecord, ds: UseDataSourceModified) {
    let selectedFeatures: DataRecord[] = []
    let selectedIds: string[] = []
    if (r && ds && ds.dataSourceId) {
      const dataSource = this.getDataSource(ds)
      selectedFeatures = this.state.selectedFeatures[ds.dataSourceId].filter((s: DataRecord) => s !== r)
      selectedIds = selectedFeatures.map(s => s.getId())
      dataSource.selectRecordsByIds(selectedIds, selectedFeatures)
    }
  };

  async deselectDSFeatures (ds: UseDataSourceModified) {
    if (ds) {
      const dataSource = this.getDataSource(ds)
      if (dataSource && dataSource.selectRecordsByIds) {
        dataSource.selectRecordsByIds([], [])
      };
    }
  };

  deselectAllFeatures () {
    const sources = this.state.useDataSources
    if (sources) {
      for (let i=0; i<sources.length; i++) {
        let ds = sources[i]
        this.deselectDSFeatures(ds)
      }
    };
  };

  componentDidMount () {
    let listUrl: string = ''
    let driveItemRootUrl: string = ''

    const sharePointSettings = this.props.config.sharePointSettings

    const validSettings = (
      sharePointSettings &&
      sharePointSettings.siteId &&
      sharePointSettings.listId &&
      sharePointSettings.driveId &&
      sharePointSettings.driveItemRootId
    )

    if (validSettings) {
      listUrl = `/sites/${sharePointSettings.siteId}/lists/${sharePointSettings.listId}`
      driveItemRootUrl = `/sites/${sharePointSettings.siteId}/drives/${sharePointSettings.driveId}/items`
    }

    this.setState({
      listUrl: listUrl,
      driveItemRootUrl: driveItemRootUrl,
      validSettings: validSettings
    })

    const appState = getAppStore().getState()
    if (!appState.user && appState.portalUrl) {
      const session = new SessionManager()
      session.signIn(document.URL, false, appState.portalUrl, "1DgMEqyMeK9dsFV3")
    } else {
      initMsal(sharePointSettings).then((results) => {
        this.setState({
          graphClient: results.graphClient,
          permissions: results.permissions
        })
        this.queryDocuments(results.graphClient);
      })
    }
  }

  getFilteredDocuments() {
    const documentFilters: SharepointFilters = this.state.documentFilters
    const documents: SharepointDocument[] = this.state.documents
    
    const filteredDocuments: SharepointDocument[] = documents.filter((d: SharepointDocument) => {
      let tagMatch = true
      let creatorMatch = true
      let startMatch = true
      let endMatch = true
      let searchMatch = true
      if (documentFilters) {
        // If the document does not include any selected tags, return false
        if (documentFilters.tags && documentFilters.tags.length > 0) {
          tagMatch = false
          if (d.fields && d.fields.Tags) {
            for (let i = 0; i < d.fields.Tags.length; i++) {
              const t = d.fields.Tags[i]
              if (documentFilters.tags.includes(t)) {
                tagMatch = true
              }
            }
          }
        }
        // If the document does not include any selected creators, return false
        if (documentFilters.creators && documentFilters.creators.length > 0 && d.createdBy && d.createdBy.user && d.createdBy.user.displayName) {
          const creators = documentFilters.creators
          if (!creators.includes(d.createdBy.user.displayName)) {
            creatorMatch = false
          } else {
            creatorMatch = true
          }
        }
        const docDate = new Date(d.createdDateTime)
        const utcDocDate = new Date(Date.UTC(docDate.getFullYear(), docDate.getMonth(), docDate.getDate()))
        // If the document was created before the selected start date, return false
        if (documentFilters.startDate) {
          const startDate = new Date(documentFilters.startDate)
          const utcStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1))
          if (utcDocDate < utcStartDate) {
            startMatch = false
          }
        }
        // If the document was created after the selected end date, return false
        if (documentFilters.endDate) {
          const endDate = new Date(documentFilters.endDate)
          const utcEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1))
          if (utcDocDate > utcEndDate) {
            endMatch = false
          }
        }
        // If the document text does not contain the search text, return false
        if (documentFilters.searchText && documentFilters.searchText !== "") {
          const searchText = documentFilters.searchText
          searchMatch = false
          const searchFields = ["DocumentDescription", "FileLeafRef", "LinkFilename", "LinkFilenameNoMenu", "Title", "Tags"]
          for (let j = 0; j < searchFields.length; j++) {
            const field = searchFields[j]
            const value = d.fields[field]
            if (value) {
              switch (typeof (value)) {
                case "object":
                  for (let k = 0; k < Object.keys(value).length; k++) {
                    const v = value[k]
                    if (v.toLowerCase().includes(searchText.toLowerCase())) {
                      searchMatch = true
                    }
                  }
                  break
                case "string":
                  if (value.toLowerCase().includes(searchText.toLowerCase())) {
                    searchMatch = true
                  }
              }
            }
          }
        }
      }
      return tagMatch && creatorMatch && startMatch && endMatch && searchMatch
    })

    return filteredDocuments
  }

  queryDocuments(graphClient?: Client, eTag?: string) {
    if (!graphClient) {
      graphClient = this.state.graphClient
    }

    if (graphClient) {
      graphClient.api(`${this.state.listUrl}/columns`)
      .header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
      .get().then(r => {
        const tagColumn = r.value.find(c => c.name && c.name === "Tags")
        graphClient.api(`${this.state.listUrl}/columns/${tagColumn.id}`)
          .header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
          .get().then(r => {
            this.setState({
              documentTags: r.choice.choices
            })

          });
      });

    graphClient.api(`${this.state.listUrl}/items?expand=fields&$top=1000000&$filter=fields/ContentType eq 'Document'`)
      .header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
      .get().then(r => {
        const documents = r.value
        if (eTag) {
          const newDoc = documents.find(doc => doc.eTag.split(",")[0].replace(`"`, "") === eTag)
          this.setState({
            infoModalDocument: newDoc
          })
        }
        const creatorList = Array.from(new Set(documents.map((d: SharepointDocument) => d.createdBy.user.displayName)))

        let dsm
        if (this.state.dataSourceManager) {
          dsm = this.state.dataSourceManager
        } else {
          dsm = DataSourceManager.getInstance()
        }
        const featureFKs = documents.map(d => d.fields.FeatureFKs).flat().filter(f => f !== undefined)
        const uniqueFKs = Array.from(new Set(featureFKs))
        const useDataSources = this.state.useDataSources
        for (let i = 0; i < useDataSources.length; i++) {
          const useDataSource = useDataSources[i]
          dsm.createDataSourceByUseDataSource(useDataSource).then(dataSource => {
            if (dataSource.type === "FEATURE_LAYER" && uniqueFKs.length > 0) {
              const query = {
                where: `GlobalID IN ('${uniqueFKs.join("', '")}')`,
                outFields: "*"
              }
              const layer = dataSource.layer

              layer.queryFeatures(query).then(r => {
                useDataSource.relatedFeatures = r.features
              })
            }
          })
        }

        this.setState({
          documents: documents,
          sharepointCreators: creatorList,
          dataSourceManager: dsm
        })

      });
    }
  }

  checkRelationship(document, record) {
    let globalId = record.getFieldValue("GlobalID")
    if (globalId) {
      globalId = globalId.replace("{", "").replace("}", "")
      if (document.fields.FeatureFKs) {
        const relationships = document.fields.FeatureFKs
        return relationships.includes(globalId)
      } else {
        return false
      }
    } else {
      return false
    }

  }

  checkSelectedFeaturesCount() {
    let selectedFeatureCount = 0
    const selectedFeatureKeys = Object.keys(this.state.selectedFeatures)
    for (let i = 0; i < selectedFeatureKeys.length; i++) {
      const k = selectedFeatureKeys[i]
      selectedFeatureCount += k.length
    }
    return selectedFeatureCount
  }

  getFeatureFks() {
    const featureFks: string[] = []
    const keys = Object.keys(this.state.selectedFeatures)
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const features = this.state.selectedFeatures[k]
      for (let j = 0; j < features.length; j++) {
        const f = features[j];
        const globalId = f.getFieldValue("GlobalID");
        if (globalId) {
          featureFks.push(globalId.replace("{", "").replace("}", ""))
        } else {
          const objectId = f.getFieldValue
        }
      }
    }
    return featureFks
  }

  render() {
    let dataSourcesConfigured = false
    if (this.state.useDataSources &&
      this.state.useDataSources.length >= 1 &&
      this.state.dataSourceManager) {
      dataSourcesConfigured = true
    }
    return (
      <Container className="jimu-widget add-data d-flex flex-column h-100 overflow-hidden p-0 m-0">
        <Navbar className="border-bottom border-light-900 bg-white">
          <Nav>
            <NavItem><h2 className="m-0">Document Management</h2></NavItem>
          </Nav>
        </Navbar>
        {!this.state.validSettings ?
          <Container className="d-flex flex-column m-0 p-3 flex-grow-1 overflow-hidden">
            <Row
              className="font-weight-bold p-0 m-0"
              style={{
                fontSize: "14px"
              }}
            >
              This tool has an invalid configuration.
            </Row>
          </Container>
          :
          this.state.permissions && this.state.permissions.read ?
            <Container className="d-flex flex-column m-0 p-3 flex-grow-1 overflow-hidden">
              <Row className="m-0 p-0">
                <ButtonGroup size="default" className="flex-grow-1">
                  <Button
                    type={this.state.searchAllDocuments ? "secondary" : "primary"}
                    className={`${this.state.searchAllDocuments ? null : "text-white"} flex-grow-1`}
                    onClick={() => {
                      this.setState({ searchAllDocuments: false })
                    }}
                  >
                    Documents by Feature
                  </Button>
                  <Button
                    type={this.state.searchAllDocuments ? "primary" : "secondary"}
                    className={`${this.state.searchAllDocuments ? "text-white" : null} flex-grow-1`}
                    onClick={() => {
                      this.setState({ searchAllDocuments: true })
                    }}
                  >
                    Search All Documents
                  </Button>
                </ButtonGroup>
              </Row>
              {this.state.permissions.write ?
                <Row className="m-0 p-0 pt-3">
                  <Button
                    type="secondary"
                    onClick={() => this.setState({ uploading: true })}
                  >
                    <span>Upload new document{!this.state.searchAllDocuments && this.getFeatureFks().length > 0 ? ` attached to ${this.getFeatureFks().length} selected features` : null}</span>
                    <AddPageOutlined className="mr-0 ml-3 mb-1" />
                  </Button>
                </Row>
                : null}
              {this.state.searchAllDocuments ?
                <DocumentSearchForm
                  documentTags={this.state.documentTags}
                  documentFilters={this.state.documentFilters}
                  updateDocumentFilters={(filters) => this.setState({ documentFilters: filters })}
                  creatorList={this.state.sharepointCreators}
                />
                :
                <Row
                  className="m-0 p-x0 py-3 font-weight-bold"
                  style={{
                    fontSize: "14px"
                  }}
                >
                  {this.getFeatureFks().length} feature{this.getFeatureFks().length === 1 ? null : "s"} selected {this.getFeatureFks().length > 0 ?
                    <Button
                      className="py-0"
                      size="sm"
                      type="link"
                      onClick={() => { this.deselectAllFeatures() }}
                    >
                      <span className="font-italic">
                        Deselect All
                      </span>
                    </Button>
                    : null}
                </Row>
              }

              {!this.state.searchAllDocuments && this.getFeatureFks().length >= 100 ?
                <Row
                  className="m-0 p-0 pb-3 font-italic"
                  style={{
                    fontSize: "14px"
                  }}
                >
                  Note: A maximum of 100 records per feature layer can be selected using the map. Selecting an area that includes more than 100 records per feature layer will exclude some records from the results.
                </Row>
                : null}
              <Row id="result-container" className="p-0 m-0 flex-fill overflow-hidden bg-white">
                <Container className="m-0 px-3 border border-light-900 overflow-auto h-100">
                  {this.state.searchAllDocuments && this.state.documents ?
                    <DocumentList
                      documents={this.getFilteredDocuments()}
                      featureLabel={null}
                      setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
                      setDeletingDocument={doc => this.setState({ deletingDocument: doc })}
                      useDataSources={this.state.useDataSources}
                      permissions={this.state.permissions}
                      dataSourceManager={this.state.dataSourceManager}
                    />
                    : !this.state.searchAllDocuments ?
                      this.getFeatureFks().length === 0 ?
                        <div
                          className="pt-3"
                          style={{
                            fontSize: "14px"
                          }}
                        >
                          Using the map or table, select one or more features to view documents related to those sites.
                        </div>
                        : this.state.useDataSources.map((ds) =>
                          this.state.selectedFeatures && this.state.selectedFeatures[ds.dataSourceId] ?
                            this.state.selectedFeatures[ds.dataSourceId].map((r) =>
                              <FeatureCard
                                loading={this.state.documents === null}
                                useDataSource={ds}
                                record={r}
                                documents={this.state.documents ? this.state.documents.filter(d => this.checkRelationship(d, r)) : null}
                                expression={ds.expression ? ds.expression : null}
                                deselectFeature={() => this.deselectFeature(r, ds)}
                                documentTags={this.state.documentTags}
                                graphClient={this.state.graphClient}
                                driveItemRootUrl={this.state.driveItemRootUrl}
                                driveItemRootId={this.props.config.sharePointSettings.driveItemRootId}
                                queryDocuments={(eTag) => this.queryDocuments(null, eTag)}
                                setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
                                setDeletingDocument={doc => this.setState({ deletingDocument: doc })}
                                permissions={this.state.permissions}
                                dataSourceManager={this.state.dataSourceManager}
                              />
                            ) : null
                        )
                      : null}
                </Container>
              </Row>
              {dataSourcesConfigured ? this.state.useDataSources.map((ds) =>
                <DataSourceComponent useDataSource={ds} widgetId={this.props.id} query={this.state.query} onSelectionChange={() => this.getSelectedFeatures(ds)} />
              ) : null}
            </Container>
            :
            <Container className="d-flex flex-column m-0 p-3 flex-grow-1 overflow-hidden">
              <Row
                className="font-weight-bold p-0 m-0"
                style={{
                  fontSize: "14px"
                }}
              >
                You do not have sufficient SharePoint permissions to use this tool. Please contact your SharePoint administrator.
              </Row>
            </Container>
        }
        {this.state.uploading ?
          <UploadModal
            cancelUpload={() => this.setState({
              uploading: false
            })}
            documentTags={this.state.documentTags}
            selectedFeatures={this.state.searchAllDocuments ? null : this.state.selectedFeatures}
            graphClient={this.state.graphClient}
            driveItemRootUrl={this.state.driveItemRootUrl}
            driveItemRootId={this.props.config.sharePointSettings.driveItemRootId}
            queryDocuments={(eTag) => this.queryDocuments(null, eTag)}
          /> : null
        }
        {this.state.infoModalDocument ?
          <InfoModal
            doc={this.state.infoModalDocument}
            documentTags={this.state.documentTags}
            setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
            setDeletingDocument={doc => this.setState({ deletingDocument: doc })}
            graphClient={this.state.graphClient}
            listUrl={this.state.listUrl}
            queryDocuments={() => this.queryDocuments()}
            setEditRelationshipDoc={doc => this.setState({ editRelationshipDoc: doc })}
            useDataSources={this.state.useDataSources}
            permissions={this.state.permissions}
            dataSourceManager={this.state.dataSourceManager}
          /> : null
        }
        {this.state.deletingDocument !== null ?
          <DeleteModal
            deletingDocument={this.state.deletingDocument}
            setDeletingDocument={doc => this.setState({ deletingDocument: doc })}
            graphClient={this.state.graphClient}
            listUrl={this.state.listUrl}
            queryDocuments={() => this.queryDocuments()}
            folderRootUrl={`${this.state.driveItemRootUrl}/${this.props.config.sharePointSettings.driveItemRootId}`}
          /> : null
        }
        {this.state.editRelationshipDoc !== null ?
          <EditRelationshipModal
            doc={this.state.editRelationshipDoc}
            setDocument={doc => this.setState({ editRelationshipDoc: doc })}
            selectedFeatures={this.state.selectedFeatures}
            useDataSources={this.state.useDataSources}
            graphClient={this.state.graphClient}
            queryDocuments={() => this.queryDocuments()}
            listUrl={this.state.listUrl}
            setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
            dataSourceManager={this.state.dataSourceManager}
          /> : null
        }
      </Container>
    );
  }

}