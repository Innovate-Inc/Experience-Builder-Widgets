/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Modal, ModalHeader, ModalBody, ModalFooter, AdvancedSelect, Loading, Button, Label, TextInput, TextArea } from 'jimu-ui';
import { v4 as uuidv4 } from 'uuid';
import { Client, FileUpload, LargeFileUploadTask } from '@microsoft/microsoft-graph-client'
import DocumentInfoForm from './documentInfoForm'

interface Props {
    cancelUpload: any
    selectedFeatures: any
    documentTags: any
    graphClient: any
    driveItemRootUrl: any
    driveItemRootId: any
    queryDocuments: any
}

export default class UploadModal extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            file: null,
            documentTitle: null,
            documentDescription: null,
            selectedTags: null,
            uploadInProgress: false
        };
    };

    deselectTag(t) {
        let selectedTags = this.state.selectedTags.filter(tag => tag !== t)
        this.setState({
            selectedTags: selectedTags
        })
    }

    getFeatureFks() {
        let featureFks = []
        const selectedFeatureKeys = Object.keys(this.props.selectedFeatures)
        selectedFeatureKeys.forEach(k => {
            const features = this.props.selectedFeatures[k]
            featureFks = featureFks.concat(features.map(f => f.getFieldValue("GlobalID").replace("{", "").replace("}", "")))
        })
        return featureFks
    }

    async uploadMultiPartFile(file) {
        const client = this.props.graphClient
        const url = `${this.props.driveItemRootUrl}/${this.props.driveItemRootId}:/${uuidv4()}/${file.name}:/createUploadSession`
        const payload = {
            "properties": {
                "documentName": file.name,
                "contentType": file.type,
                "size": file.size
            }
        }
        const session = await LargeFileUploadTask.createUploadSession(client, url, payload)
        const fileUpload = new FileUpload(
            file,
            file.name,
            file.size
        )
        const task = new LargeFileUploadTask(client, fileUpload, session)
        const results = await task.upload()
        return results.responseBody;
    }

    async uploadFile() {
        this.setState({ uploadInProgress: true })
        const file = this.state.file
        const url = `${this.props.driveItemRootUrl}/${this.props.driveItemRootId}:/${uuidv4()}/${file.name}:/content`
        let featureFks = []
        if (this.props.selectedFeatures && Object.keys(this.props.selectedFeatures).length > 0) {
            featureFks = this.getFeatureFks()
        }
        const client = this.props.graphClient
        let driveItem;
        if (file.size < 4194304) {
            driveItem = await client.api(url).put(file)
        } else {
            driveItem = await this.uploadMultiPartFile(file)
        }
        const fields = {
            Title: this.state.documentTitle,
            DocumentDescription: this.state.documentDescription
        };
        if (featureFks.length > 0) {
            fields["FeatureFKs@odata.type"] = "Collection(Edm.String)"
            fields["FeatureFKs"] = featureFks
        }

        if (this.state.selectedTags) {
            fields["Tags@odata.type"] = "Collection(Edm.String)"
            fields["Tags"] = this.state.selectedTags.map(t => t.value)
        }
        await client.api(`${this.props.driveItemRootUrl}/${driveItem.id}/listitem/fields`)
            .update(fields)

        const eTag = driveItem.eTag.split(",")[0].replace(`"`, "").replace("{", "").replace("}", "").toLowerCase()
        this.props.queryDocuments(eTag)
        this.setState({ uploadInProgress: false })
        this.props.cancelUpload()
    }

    checkRequiredFields() {
        const file = this.state.file
        const title = this.state.documentTitle
        const desc = this.state.documentDescription
        if (file && title && title !== "" && desc && desc !== "") {
            return false
        } else {
            return true
        }
    }

    render() {
        return (
            <Modal
                onClosed={() => this.props.cancelUpload()}
                onExit={() => this.props.cancelUpload()}
                toggle={() => this.props.cancelUpload()}
                centered
                isOpen
            >
                <ModalHeader toggle={() => this.props.cancelUpload()}>
                    <h4 className="m-0">Upload new document</h4>
                </ModalHeader>
                <ModalBody>
                    {this.state.uploadInProgress ?
                        <div className="sharepoint-widget__loading-container">
                            <span className="sharepoint-widget__descriptive-text">Uploading {this.state.file.name}...</span>
                            <Loading type="DONUT" />
                        </div> :
                        <DocumentInfoForm
                            documentTags={this.props.documentTags}
                            selectedTags={this.state.selectedTags}
                            updateDocumentInfo={(newInfo) => this.setState(newInfo)}
                            documentTitle={null}
                            documentDescription={null}
                            upload={true}
                        />
                    }
                    <div className="mt-4 sharepoint-widget__descriptive-text font-weight-bold">
                        {this.props.selectedFeatures && this.getFeatureFks().length > 0 ?
                            `This document will be attached to ${this.getFeatureFks().length} selected feature${this.getFeatureFks().length > 1 ? "s" : ""}.`    
                        :
                            "This document will not be attached to any features."
                        }
                    </div>
                </ModalBody>
                <ModalFooter className="justify-content-between flex-fill">
                    <Button
                        disabled={this.checkRequiredFields() || this.state.uploadInProgress}
                        onClick={() => this.uploadFile()}
                    >
                        Upload document
                    </Button>
                    <Button
                        disabled={this.state.uploadInProgress}
                        onClick={() => this.props.cancelUpload()}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        )
    }
}