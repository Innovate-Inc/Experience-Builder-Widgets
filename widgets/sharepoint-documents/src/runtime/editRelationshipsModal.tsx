/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Modal, ModalHeader, ModalBody, ModalFooter, Tooltip, Button, Loading, Row, Label, Checkbox, Tabs, Tab } from 'jimu-ui';

interface Props {
    doc: any
    setDocument: any
    selectedFeatures: any
    useDataSources: any
    graphClient: any
    queryDocuments: any
    listUrl: any
    setInfoModalDocument: any
}

export default class EditRelationshipsModal extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            inputFeatures: [],
            updateInProgress: false
        };
    };

    async updateFKs() {
        this.setState({
            updateInProgress: true
        })
        const client = this.props.graphClient
        const fields = {}
        fields["FeatureFKs@odata.type"] = "Collection(Edm.String)"
        fields["FeatureFKs"] = this.state.inputFeatures

        const newFields = await client.api(`${this.props.listUrl}/items/${this.props.doc.id}/fields`)
            .update(fields)
        const updatedDoc = {...this.props.doc}
        updatedDoc.fields = newFields
        this.props.queryDocuments()
        this.setState({ updateInProgress: false })
        this.props.setInfoModalDocument(updatedDoc)
        this.props.setDocument(null)
    }

    getFeatureLabel(f, exp) {
		let validExpression = true
		let header;
		header = exp.parts.map((part) => {
			if (part.type === "FUNCTION") {
				validExpression = false
				return null
			} else if (part.type === "FIELD") {
				if (f.attributes && f.attributes[part.jimuFieldName]) {
					return f.attributes[part.jimuFieldName].toString()
				} else if (f.getFieldValue(part.jimuFieldName)) {
					return f.getFieldValue(part.jimuFieldName).toString()
				} else {
                    return "None"
                }
			} else if (part.type === "OPERATOR") {
				if (part.exp === "+") {
					return ""
				} else {
					validExpression = false
					return null
				}
			} else {
				return part.exp.toString().replaceAll('"', '')
			}
		})
		if (validExpression) {
			return header.join("")
		} else {
			return "Invalid feature label (includes function or unsupported operator)"
		}
	}

    getRelatedFeatures(ds) {
        const docFks = this.props.doc.fields.FeatureFKs
        const relatedFeatures = ds.relatedFeatures.filter(f => {
            const featureFk = f.attributes.GlobalID.replace("{", "").replace("}", "")
            return docFks.includes(featureFk)
        })
        return relatedFeatures
    }

    onCheckFeature(e, f) {
        let fk
        if (f.attributes && f.attributes.GlobalID) {
            fk = f.attributes.GlobalID.replace("{", "").replace("}", "")
        } else {
            fk = f.getFieldValue("GlobalID").replace("{", "").replace("}", "")
        }
        
        let inputFeatures = [...this.state.inputFeatures]
        if (inputFeatures.includes(fk)) {
            inputFeatures.splice(inputFeatures.indexOf(fk), 1)
        } else {
            inputFeatures.push(fk)
        }
        this.setState({inputFeatures: inputFeatures})
    }

    componentDidMount() {
        const docFks = this.props.doc.fields.FeatureFKs
        let relatedFeatures = []
        if (docFks) {
            this.props.useDataSources.forEach(ds => {
                let dsFeatures = ds.relatedFeatures.map(f => f.attributes.GlobalID.replace("{", "").replace("}", ""))
                relatedFeatures = relatedFeatures.concat(dsFeatures.filter(f => docFks.includes(f)))
            })
        }
        this.setState({
            inputFeatures: relatedFeatures
        })
    }

    render() {
        const doc = this.props.doc
        return (
            <Modal
                onClosed={() => this.props.setDocument(null)}
                onExit={() => this.props.setDocument(null)}
                toggle={() => this.props.setDocument(null)}
                centered
                isOpen
            >
                <ModalHeader toggle={() => this.props.setDocument(null)}>
                    <h4 className="m-0">Update Related Features</h4>
                </ModalHeader>
                <ModalBody>
                    {/* TODO - Add loading indicator */}
                    <div className="d-flex flex-row">
                        <h5>{doc.fields.Title ? doc.fields.Title : doc.fields.LinkFilename}</h5>
                    </div>
                    <Tabs
                        defaultValue="tab-1"
                        onChange={function noRefCheck(){}}
                        onClose={function noRefCheck(){}}
                        type="tabs"
                    >
                        <Tab
                            id="related"
                            title="Current related features"
                        >
                            <div className="feature-selection-container p-3 border-bottom border-left border-right border-light-500">
                                {this.props.useDataSources && doc.fields.FeatureFKs ? this.props.useDataSources.map(ds =>
                                    this.getRelatedFeatures(ds).length > 0 ?
                                        <div className="sharepoint-widget__descriptive-text pb-3">
                                            <div className="font-weight-bold pb-2">{ds.dataSource.layerDefinition.name}</div>
                                            <div>
                                                {this.getRelatedFeatures(ds).map(f => 
                                                    <Label
                                                        className="m-1 w-100"
                                                        centric
                                                        check
                                                    >
                                                        <Checkbox
                                                            className="mr-2"
                                                            checked={this.state.inputFeatures.includes(f.attributes.GlobalID.replace("{", "").replace("}", ""))}
                                                            onClick={(e) => this.onCheckFeature(e, f)}
                                                        />
                                                        {this.getFeatureLabel(f, ds.expression)}
                                                    </Label>
                                                )}
                                            </div>
                                        </div>
                                    : null
                                ) : null}
                            </div>
                        </Tab>
                        <Tab
                            id="selected"
                            title="Selected Features"
                        >
                            <div className="feature-selection-container p-3 border-bottom border-left border-right border-light-500">
                                {this.props.useDataSources ? this.props.useDataSources.map(ds =>
                                    this.props.selectedFeatures[ds.dataSourceId] && this.props.selectedFeatures[ds.dataSourceId].length > 0 ?
                                        <div className="sharepoint-widget__descriptive-text pb-3">
                                            <div className="font-weight-bold pb-2">{ds.dataSource.layerDefinition.name}</div>
                                            <div>
                                                {this.props.selectedFeatures[ds.dataSourceId].map(f => 
                                                    <Label
                                                        className="m-1 w-100"
                                                        centric
                                                        check
                                                    >
                                                        <Checkbox
                                                            className="mr-2"
                                                            checked={this.state.inputFeatures.includes(f.getFieldValue("GlobalID").replace("{", "").replace("}", ""))}
                                                            onClick={(e) => this.onCheckFeature(e, f)}
                                                        />
                                                        {this.getFeatureLabel(f, ds.expression)}
                                                    </Label>
                                                )}
                                            </div>
                                        </div>
                                    : null
                                ) : null}
                            </div>
                        </Tab>
                    </Tabs>
                    <div className="my-2 font-weight-bold sharepoint-widget__descriptive-text">
                        This document will be updated to be related to {this.state.inputFeatures.length === 1 ? "1 feature." : `${this.state.inputFeatures.length} features.`}
                    </div>
                </ModalBody>
                <ModalFooter className="justify-content-between flex-fill">
                    <Button
                        onClick={() => this.updateFKs()}
                    >
                        Save
                    </Button>
                    <Button
                        onClick={() => this.props.setDocument(null)}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        )
    }
}