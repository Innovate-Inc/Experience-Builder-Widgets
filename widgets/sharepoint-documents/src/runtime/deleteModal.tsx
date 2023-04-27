/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Modal, ModalHeader, ModalBody, ModalFooter, Tooltip, Button, Loading } from 'jimu-ui';
import { LaunchOutlined } from 'jimu-icons/outlined/editor/launch'

interface Props {
    deletingDocument: any
    setDeletingDocument: any
    graphClient: any
    listUrl: any
    queryDocuments: any
    folderRootUrl: any
}

export default class DeleteModal extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            deletionInProgress: false
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

    async deleteDocument() {
		const client = this.props.graphClient
        const doc = this.props.deletingDocument
        await client.api(`${this.props.listUrl}/items/${doc.id}`).delete()
        const parentId = doc.webUrl.split('/')[6]
        await client.api(`${this.props.folderRootUrl}:/${parentId}`).delete()
        this.setState({deletionInProgress: false})
        this.props.setDeletingDocument(null)
		this.props.queryDocuments()
	}

    render() {
        const doc = this.props.deletingDocument
        return (
            <Modal
                onClosed={() => this.props.setDeletingDocument(null)}
                onExit={() => this.props.setDeletingDocument(null)}
                toggle={() => this.props.setDeletingDocument(null)}
                centered
                isOpen
            >
                <ModalHeader toggle={() => this.props.setDeletingDocument(null)}>
                    <h4 className="m-0">Delete this document?</h4>
                </ModalHeader>
                <ModalBody>
                    {this.state.deletionInProgress ?
                        <div className="sharepoint-widget__loading-container">
                            Deleting {doc.fields.LinkFilename}...
                            <Loading type="DONUT" />
                        </div> :
                        <div>
                            <div className="d-flex flex-row">
                                <h5>{doc.fields.Title ? doc.fields.Title : doc.fields.LinkFilename}</h5>
                                <Tooltip
                                    onClose={function noRefCheck() { }}
                                    onOpen={function noRefCheck() { }}
                                    placement="bottom-end"
                                    title="Open this document in a new tab"
                                >
                                    <Button
                                        type="tertiary"
                                        size="sm"
                                        icon
                                        className="ml-1 mb-2"
                                        href={doc.webUrl}
                                        target="_blank"
                                    >
                                        <LaunchOutlined />
                                    </Button>
                                </Tooltip>
                            </div>
                            {doc.fields.DocumentDescription ? <div className="d-flex flex-row mt-2 pb-4 mb-4 border-bottom border-light-900 sharepoint-widget__descriptive-text">
                                    {doc.fields.DocumentDescription}
                                </div> : null}
                            {doc.fields.Title ? <div>{doc.fields.LinkFilename}</div> : null}
                            <div>{this.getMetaData(doc)}</div>
                            <div className="d-flex flex-wrap">
                                {doc.fields.Tags ? doc.fields.Tags.map((t) => 
                                    <div className="sharepoint-widget__badge">
                                        {t}
                                    </div>
                                ) : null}
                            </div>
                            <div className="mt-2 font-weight-bold sharepoint-widget__descriptive-text">
                                {doc.fields.FeatureFKs && doc.fields.FeatureFKs.length > 1 ?
                                    `Note: This document is currently related to ${doc.fields.FeatureFKs.length} features. Deleting this document will remove those relationships.`
                                : doc.fields.FeatureFKs && doc.fields.FeatureFKs.length === 1 ?
                                    "Note: This document is currently related to 1 feature. Deleting this document will remove that relationship."
                                : "Note: This document is not related to any features. Deleting it will not affect any relationships."
                                }
                            </div>
                        </div>
                    }
                </ModalBody>
                <ModalFooter className="justify-content-between flex-fill">
                    <Button
                        disabled={this.state.deletionInProgress}
                        onClick={() => {
                            this.setState({deletionInProgress: true})
                            this.deleteDocument()
                        }}
                    >
                        Delete Document
                    </Button>
                    <Button
                        disabled={this.state.deletionInProgress}
                        onClick={() => this.props.setDeletingDocument(null)}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        )
    }
}