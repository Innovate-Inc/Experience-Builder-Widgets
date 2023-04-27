import { React, AllWidgetProps, DataSourceComponent, DataSourceManager, SessionManager, getAppStore } from "jimu-core";
import { Navbar, Nav, NavItem, Button, Container, Row } from "jimu-ui";
import { AddPageOutlined } from 'jimu-icons/outlined/editor/add-page'
import { RightOutlined } from 'jimu-icons/outlined/directional/right'
import initMsal from "./utils"
import FeatureCard from "./featureCard"
import UploadModal from "./uploadModal";
import InfoModal from "./infoModal";
import DeleteModal from "./deleteModal";
import DocumentSearchForm from "./documentSearchForm";
import DocumentList from "./documentList";
import EditRelationshipModal from "./editRelationshipsModal"

export default class Widget extends React.PureComponent<AllWidgetProps<any>, any> {

	constructor(props) {
		super(props)
		this.state = {
			dataSourceManager: null,
			listUrl: "",
			driveItemRootUrl: "",
			graphClient: null,
			permissions: {
				write: false,
				read: false,
				delete: false
			},
			selectedFeatures: {},
			documents: null,
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
				searchText: "",
				creators: []
			},
			useDataSources: []
		};
	};

	static getDerivedStateFromProps(props) {
        return {
            useDataSources: props.useDataSources
        }
    }

	getSelectedFeatures(ds) {
		const selectedFeatures = ds.dataSource.getSelectedRecords()
		this.setState(prevState => {
			const newSelectedFeatures = { ...prevState.selectedFeatures }
			newSelectedFeatures[ds.dataSourceId] = selectedFeatures
			return {
				selectedFeatures: newSelectedFeatures
			}
		})
	}

	deselectFeature(r, ds) {
		const selectedFeatures = this.state.selectedFeatures[ds.dataSourceId].filter(s => s !== r)
		const selectedIds = selectedFeatures.map(s => s.getId())
		ds.dataSource.selectRecordsByIds(selectedIds, selectedFeatures)
	}

	async deselectDSFeatures(ds) {
		await ds.dataSource.selectRecordsByIds([], [])
	}
	
	deselectAllFeatures() {
		this.state.useDataSources.forEach(ds => {
			ds.dataSource.selectRecordsByIds([], [])
		})
	}

	componentDidMount() {
		const sharePointSettings = this.props.config.sharePointSettings
		if (sharePointSettings.siteId) {
			let listUrl = sharePointSettings.listId ? `/sites/${sharePointSettings.siteId}/lists/${sharePointSettings.listId}` : ""
			let driveItemRootUrl = sharePointSettings.driveId && sharePointSettings.driveItemRootId ? `/sites/${sharePointSettings.siteId}/drives/${sharePointSettings.driveId}/items` : ""
			this.setState({
				listUrl: listUrl,
				driveItemRootUrl: driveItemRootUrl,
			})
		}

		let appState = getAppStore().getState()
		if (appState.user === null) {
			let session = new SessionManager()
			session.signIn(document.URL, false, appState.portalUrl, "1DgMEqyMeK9dsFV3")
		} else {
			initMsal(sharePointSettings).then((results) => {
				this.setState({
					graphClient: results.graphClient,
					permissions: results.permissions
				})
				this.queryDocuments(results.graphClient)
			})
		}
	}

	getFilteredDocuments() {
		const documentFilters = this.state.documentFilters
		const documents = this.state.documents
		let filteredDocuments = documents
		if (documentFilters && documentFilters.tags && documentFilters.tags.length > 0) {
			const filteredTags = documentFilters.tags.map(t => t.value)
			filteredDocuments = filteredDocuments.filter(d => {
				let match = false
				if (d.fields.Tags) {
					d.fields.Tags.forEach(t => {
						if (filteredTags.includes(t)) {
							match = true
						}
					})
				}
				return match
			})
		}

		if (documentFilters && documentFilters.creators && documentFilters.creators.length > 0) {
			const creators = documentFilters.creators.map(c => c.value)
			filteredDocuments = filteredDocuments.filter(d => {
				return creators.includes(d.createdBy.user.displayName)
			})
		}

		if (documentFilters && documentFilters.startDate) {
			filteredDocuments = filteredDocuments.filter(d => {
				const docDate = new Date(d.createdDateTime)
				const utcDocDate = new Date(Date.UTC(docDate.getFullYear(), docDate.getMonth(), docDate.getDate()))
				const startDate = new Date(documentFilters.startDate)
				const utcStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1))
				return utcDocDate >= utcStartDate
			})
		}

		if (documentFilters && documentFilters.endDate) {
			filteredDocuments = filteredDocuments.filter(d => {
				const docDate = new Date(d.createdDateTime)
				const utcDocDate = new Date(Date.UTC(docDate.getFullYear(), docDate.getMonth(), docDate.getDate()))
				const endDate = new Date(documentFilters.endDate)
				const utcEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1))
				return utcDocDate <= utcEndDate
			})
		}

		if (documentFilters && documentFilters.searchText && documentFilters.searchText !== "") {
			const searchText = documentFilters.searchText
			filteredDocuments = filteredDocuments.filter(d => {
				let termFound = false
				const searchFields = ["DocumentDescription", "FileLeafRef", "LinkFilename", "LinkFilenameNoMenu", "Title", "Tags"]
				const fields = d.fields
				searchFields.forEach(f => {
					const value = fields[f]
					if (value) {
						switch (typeof(value)) {
							case "object":
								value.forEach(v => {
									if (v.toLowerCase().includes(searchText.toLowerCase())) {
										termFound = true
									}
								})
								break
							case "string":
								if (value.toLowerCase().includes(searchText.toLowerCase())) {
									termFound = true
								}
						}
					}
				})
				return termFound
			})
		}

		return filteredDocuments
	}

	queryDocuments(graphClient = null, eTag = null) {
		if (graphClient === null) {
			graphClient = this.state.graphClient
		}

		graphClient.api(`${this.state.listUrl}/columns`)
			.header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
			.get().then(r => {
				const tagColumn = r.value.find(c => c.name === "Tags")
				graphClient.api(`${this.state.listUrl}/columns/${tagColumn.id}`)
					.header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
					.get().then(r => {
						const documentTags = r.choice.choices.map(t => {
							return {
								"label": t,
								"value": t
							}
						})
						this.setState({
							documentTags: documentTags
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
				const creators = Array.from(new Set(documents.map(d => d.createdBy.user.displayName)))
				const creatorList = creators.map(c => {
					return {
						"label": c,
						"value": c
					}
				})
				let dsm
				if (this.state.dataSourceManager) {
					dsm = this.state.dataSourceManager
				} else {
					dsm = DataSourceManager.getInstance()
				}
				dsm.createAllDataSources().then(() => {
					const featureFKs = documents.map(d => d.fields.FeatureFKs).flat().filter(f => f !== undefined)
					const uniqueFKs = Array.from(new Set(featureFKs))
					this.state.useDataSources.forEach((ds, i) => {
						const useDataSources = [...this.state.useDataSources]
						const useDataSource = useDataSources[i]
						const dataSource = dsm.getDataSource(ds.dataSourceId)
						useDataSource.dataSource = dataSource
						if (dataSource.type === "FEATURE_LAYER") {
							let query = {
								where: `GlobalID IN ('${uniqueFKs.join("', '")}')`,
								outFields: "*"
							}
							const layer = dataSource["layer"]
							
							layer.queryFeatures(query=query).then(r => {
								useDataSource.relatedFeatures = r.features
								this.setState({
									useDataSources: useDataSources
								})
							})
						}
					})
					this.setState({
						dataSourceManager: dsm
					})
				})
				

				this.setState({
					documents: documents,
					creatorList: creatorList
				})

			});
	}

	checkRelationship(document, record) {
		let globalId = record.getFieldValue("GlobalID")
		globalId = globalId.replace("{", "").replace("}", "")
		if (document.fields.FeatureFKs) {
			const relationships = document.fields.FeatureFKs
			return relationships.includes(globalId)
		} else {
			return false
		}
	}

	checkSelectedFeaturesCount() {
		let selectedFeatureCount = 0
		const selectedFeatureKeys = Object.keys(this.state.selectedFeatures)
		selectedFeatureKeys.forEach(k => selectedFeatureCount += this.state.selectedFeatures[k].length)
		return selectedFeatureCount
	}

	getFeatureFks() {
        let featureFks = []
        const selectedFeatureKeys = Object.keys(this.state.selectedFeatures)
        selectedFeatureKeys.forEach(k => {
            const features = this.state.selectedFeatures[k]
            featureFks = featureFks.concat(features.map(f => f.getFieldValue("GlobalID").replace("{", "").replace("}", "")))
        })
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
				{this.state.permissions.read ?
					<Container className="d-flex flex-column m-0 p-3 flex-grow-1 overflow-hidden">
						<Row className="m-0 p-0">
							<h3>
								{this.state.searchAllDocuments ? "Search All Documents" : "Documents by Feature"}
							</h3>
							<Button
								type="link"
								onClick={() => {
									this.setState({ searchAllDocuments: !this.state.searchAllDocuments })
								}}
							>
								<span>
									{this.state.searchAllDocuments ? "Documents by Feature" : "Search All Documents"}
								</span>
								<RightOutlined
									className="mr-0 ml-1"
								/>
							</Button>
						</Row>
						{this.state.permissions.write ?
							<Row className="m-0 p-0 py-3">
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
								updateDocumentFilters={(filters) => this.setState({documentFilters: filters})}
								creatorList={this.state.creatorList}
							/>
						:
							<Row className="m-0 p-0 pb-3 sharepoint-widget__descriptive-text font-weight-bold">
								{this.getFeatureFks().length} feature{this.getFeatureFks().length === 1 ? null : "s"} selected {this.getFeatureFks().length > 0 ?
									<Button
										className="py-0"
										size="sm"
										type="link"
										onClick={() => {this.deselectAllFeatures()}}
									>
										<span className="font-italic">
											Deselect All
										</span>
									</Button>
								: null}
							</Row>
						}
						<Row id="result-container" className="p-0 m-0 flex-fill overflow-hidden bg-white">
							<Container className="m-0 px-3 border border-light-900 overflow-auto h-100">
								{this.state.searchAllDocuments && this.state.documents ?
									<DocumentList
										documents={this.getFilteredDocuments()}
										featureLabel={null}
										setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
										setDeletingDocument={doc => this.setState({ deletingDocument: doc})}
										useDataSources={this.state.useDataSources}
										permissions={this.state.permissions}
									/>
								: !this.state.searchAllDocuments ? 
									this.getFeatureFks().length === 0 ?
										<div className="pt-3 sharepoint-widget__descriptive-text">
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
													expression={ds["expression"] ? ds["expression"] : null}
													deselectFeature={() => this.deselectFeature(r, ds)}
													documentTags={this.state.documentTags}
													graphClient={this.state.graphClient}
													driveItemRootUrl={this.state.driveItemRootUrl}
													driveItemRootId={this.props.config.sharePointSettings.driveItemRootId}
													queryDocuments={(eTag) => this.queryDocuments(null, eTag)}
													setInfoModalDocument={doc => this.setState({ infoModalDocument: doc })}
													setDeletingDocument={doc => this.setState({ deletingDocument: doc })}
													permissions={this.state.permissions}
												/>
											) : null
									)
								: null}
							</Container>
						</Row>
						{dataSourcesConfigured ? this.state.useDataSources.map((ds) =>
							<DataSourceComponent useDataSource={ds} widgetId={this.props.id} onSelectionChange={() => this.getSelectedFeatures(ds)} />
						) : null}
					</Container>
				:
					<Container className="d-flex flex-column m-0 p-3 flex-grow-1 overflow-hidden">
						<Row className="sharepoint-widget__descriptive-text font-weight-bold p-0 m-0">
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
						selectedFeatures={this.state.searchAllDocuments? null : this.state.selectedFeatures}
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
						setEditRelationshipDoc={doc => this.setState({editRelationshipDoc: doc})}
						useDataSources={this.state.useDataSources}
						permissions={this.state.permissions}
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
						setDocument={doc => this.setState({editRelationshipDoc: doc})}
						selectedFeatures={this.state.selectedFeatures}
						useDataSources={this.state.useDataSources}
						graphClient={this.state.graphClient}
						queryDocuments={() => this.queryDocuments()}
						listUrl={this.state.listUrl}
						setInfoModalDocument={doc => this.setState({infoModalDocument: doc})}
					/> : null
				}
			</Container>
		);
	}

}