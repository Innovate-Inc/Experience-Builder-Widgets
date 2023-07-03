/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Modal, ModalHeader, ModalBody, ModalFooter, Tooltip, Button, Loading, Row } from 'jimu-ui';
import { LaunchOutlined } from 'jimu-icons/outlined/editor/launch'
import { EditOutlined } from 'jimu-icons/outlined/editor/edit'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';
import { WidgetListOutlined } from 'jimu-icons/outlined/brand/widget-list'
import DocumentInfoForm from './documentInfoForm'

interface Props {
    doc: any
    documentTags: any
    setInfoModalDocument: any
    graphClient: any
    queryDocuments: any
    listUrl: any
    setDeletingDocument: any
    setEditRelationshipDoc: any
    useDataSources: any
    permissions: any
}

export default class InfoModal extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            editInProgress: false,
            updateInProgress: false,
            documentTitle: null,
            documentDescription: null,
            selectedTags: null
        };
    };

    getMetaData(d) {
        if (d && d.createdBy && d.createdBy.user && d.createdBy.user.displayName && d.createdDateTime) {
            let createdBy = d.createdBy.user.displayName
            let createdDate = new Date(d.createdDateTime)
            return `Uploaded ${createdDate.toLocaleString()} by ${createdBy}`
        } else {
            return null
        }
    }

    async updateFile() {
        this.setState({
            updateInProgress: true,
            editInProgress: false
        })
        const client = this.props.graphClient
        const fields = {
            Title: this.state.documentTitle,
            DocumentDescription: this.state.documentDescription
        };
        if (this.state.selectedTags) {
            fields["Tags@odata.type"] = "Collection(Edm.String)"
            fields["Tags"] = this.state.selectedTags.map(t => t.value)
        }

        const newFields = await client.api(`${this.props.listUrl}/items/${this.props.doc.id}/fields`)
            .update(fields)
        const updatedDoc = {...this.props.doc}
        updatedDoc.fields = newFields
        this.props.setInfoModalDocument(updatedDoc)

        this.props.queryDocuments()
        this.setState({ updateInProgress: false })
    }

    setInitialFields() {
        const doc = this.props.doc
        const title = doc.fields.Title
        const description = doc.fields.DocumentDescription
        const tags = doc.fields.Tags ? doc.fields.Tags.map(t => {
            return {
                "label": t,
                "value": t
            }
        }) : []
        this.setState({
            documentTitle: title,
            documentDescription: description,
            selectedTags: tags
        })
    }

    
    compareFKs(relatedFeatures, docFKs) {
        if (docFKs === undefined || relatedFeatures === undefined) {
            return 0
        }
        let dataSourceFKs = relatedFeatures.map(f => f.attributes.GlobalID.replace("{", "").replace("}", ""))
        const fkMatches = dataSourceFKs.filter(fk => docFKs.includes(fk))
        return fkMatches.length
    }

    countAllRelatedFKs(docFKs) {
        let totalRelatedFKs = 0
        if (this.props.useDataSources) {
            this.props.useDataSources.forEach(ds => {
                totalRelatedFKs += this.compareFKs(ds.relatedFeatures, docFKs)
            })
        }
        return totalRelatedFKs > 0
    }

    checkRequiredFields() {
        const title = this.state.documentTitle
        const desc = this.state.documentDescription
        if (title && title !== "" && desc && desc !== "") {
            return false
        } else {
            return true
        }
    }

    componentDidMount() {
        this.setInitialFields()
    }

    render() {
        const doc = this.props.doc
        return (
            <Modal
                onClosed={() => this.props.setInfoModalDocument(null)}
                onExit={() => this.props.setInfoModalDocument(null)}
                toggle={() => this.props.setInfoModalDocument(null)}
                centered
                isOpen
            >
                <ModalHeader toggle={() => this.props.setInfoModalDocument(null)}>
                    <h4 className="m-0">{this.state.editInProgress ? "Editing Document Info" : "Document Info"}</h4>
                </ModalHeader>
                <ModalBody>
                    {this.state.updateInProgress ?
                        <div
                            style={{
                                height: "50px",
                                position: "relative",
                                width: "100%"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "14px"
                                }}
                            >
                                Updating {doc.LinkFilename}...
                            </span>
                            <Loading type="DONUT" />
                        </div>
                    : this.state.editInProgress ?
                        <DocumentInfoForm
                            documentTags={this.props.documentTags}
                            updateDocumentInfo={newInfo => this.setState(newInfo)}
                            documentTitle={this.state.documentTitle}
                            documentDescription={this.state.documentDescription}
                            selectedTags={this.state.selectedTags}
                            upload={false}
                        />
                        :
                        <div>
                            <div className="d-flex flex-row">
                                <h5>{doc.fields.Title ? doc.fields.Title : doc.fields.LinkFilename}</h5>
                            </div>
                            {doc.fields.DocumentDescription ?
                                <div
                                    className="d-flex flex-row mt-2 pb-4 mb-4 border-bottom border-light-900"
                                    style={{
                                        fontSize: "14px"
                                    }}
                                >
                                    {doc.fields.DocumentDescription}
                                </div>
                            : null}
                            {doc.fields.Title ? <div>{doc.fields.LinkFilename}</div> : null}
                            <div className="mt-1">{this.getMetaData(doc)}</div>
                            <div className="d-flex flex-wrap mt-1">
                                {doc.fields.Tags ? doc.fields.Tags.map((t) =>
                                    <div
                                        style={{
                                            borderRadius: "10px",
                                            margin: "5px 5px 5px 0px",
                                            padding: "5px 10px",
                                            background: "#D0544E",
                                            color: "#FFFFFD"
                                        }}
                                    >
                                        {t}
                                    </div>
                                ) : null}
                            </div>
                            <div className="mt-2">
                                {this.props.useDataSources ? <span className="font-weight-bold">{this.countAllRelatedFKs(doc.fields.FeatureFKs) ? "Related: " : "No related features"}</span> : null}
                                {this.props.useDataSources && this.countAllRelatedFKs(doc.fields.FeatureFKs) ? this.props.useDataSources.filter(ds => this.compareFKs(ds.relatedFeatures, doc.fields.FeatureFKs) > 0).map(ds => {
                                    const fkMatchCount = this.compareFKs(ds.relatedFeatures, doc.fields.FeatureFKs)
                                    return <span>{ds.dataSource.layerDefinition.name} ({fkMatchCount} feature{fkMatchCount > 1 ? "s" : null})</span>
                                }).reduce((a, b) => [a, ", ", b]) : null}
                            </div>
                        </div>
                    }
                </ModalBody>
                <ModalFooter className="justify-content-between flex-fill">
                    {this.state.editInProgress ?
                        <Button
                            disabled={this.checkRequiredFields() || this.state.updateInProgress}
                            onClick={() => this.updateFile()}
                        >
                            Save
                        </Button>
                    :
                        <Button
                            disabled={this.state.updateInProgress}
                            onClick={() => this.props.setInfoModalDocument(null)}
                        >
                            Close
                        </Button>
                    }
                    
                    {this.state.editInProgress ?
                        <Button
                            disabled={this.state.updateInProgress}
                            onClick={() => {
                                this.setState({ editInProgress: false })
                                this.setInitialFields()
                            }}
                        >
                            Cancel
                        </Button>
                    :
                        <Row className="m-0 p-0">
                            <Tooltip
                                onClose={function noRefCheck() { }}
                                onOpen={function noRefCheck() { }}
                                placement="bottom-end"
                                title="Open document in a new tab"
                            >
                                <span>
                                    <Button
                                        type="tertiary"
                                        icon
                                        className="m-1"
                                        disabled={this.state.updateInProgress}
                                        href={doc.webUrl}
                                        target="_blank"
                                    >
                                        <LaunchOutlined />
                                    </Button>
                                </span>
                            </Tooltip>
                            {this.props.permissions.write ?
                                <Tooltip
                                    onClose={function noRefCheck() { }}
                                    onOpen={function noRefCheck() { }}
                                    placement="bottom-end"
                                    title="Edit document info"
                                >
                                    <span>
                                        <Button
                                            type="tertiary"
                                            icon
                                            className="m-1"
                                            disabled={this.state.updateInProgress}
                                            onClick={() => this.setState({ editInProgress: true })}
                                        >
                                            <EditOutlined />
                                        </Button>
                                    </span>
                                </Tooltip>
                            : null}
                            {this.props.permissions.write ?
                                <Tooltip
                                    onClose={function noRefCheck() { }}
                                    onOpen={function noRefCheck() { }}
                                    placement="bottom-end"
                                    title="Edit related features"
                                >
                                    <span>
                                        <Button
                                            type="tertiary"
                                            icon
                                            className="m-1"
                                            disabled={this.state.updateInProgress}
                                            onClick={(() =>  {
                                                this.props.setEditRelationshipDoc(doc)
                                                this.props.setInfoModalDocument(null)
                                            })}
                                        >
                                            <WidgetListOutlined />
                                        </Button>
                                    </span>
                                </Tooltip>
                            : null}
                            {this.props.permissions.delete ?
                                <Tooltip
                                    onClose={function noRefCheck() { }}
                                    onOpen={function noRefCheck() { }}
                                    placement="bottom-end"
                                    title="Delete this document"
                                >
                                    <span>
                                        <Button
                                            type="tertiary"
                                            icon
                                            className="m-1"
                                            disabled={this.state.updateInProgress}
                                            onClick={(() =>  {
                                                this.props.setDeletingDocument(doc)
                                                this.props.setInfoModalDocument(null)
                                            })}
                                        >
                                            <TrashOutlined />
                                        </Button>
                                    </span>
                                </Tooltip>
                            : null}
                        </Row>
                    }
                </ModalFooter>
            </Modal>
        )
    }
}