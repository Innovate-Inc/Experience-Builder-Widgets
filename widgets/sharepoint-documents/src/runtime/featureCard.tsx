/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Card, CardBody, CardHeader, Button, Tooltip, Loading } from 'jimu-ui';
import { MinusCircleOutlined } from 'jimu-icons/outlined/editor/minus-circle'
import { AddPageOutlined } from 'jimu-icons/outlined/editor/add-page'
import DocumentList from './documentList';
import UploadModal from './uploadModal';

interface Props {
    useDataSource: any
    record: any
    documents: any
    expression: any
    deselectFeature: any
    loading: boolean
    graphClient: any
    documentTags: any
    driveItemRootUrl: any
    driveItemRootId: any
    queryDocuments: any
    setInfoModalDocument: any
    setDeletingDocument: any
    permissions: any
}

export default class FeatureCard extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            uploading: false
        };
    };

    getRecordHeader(r) {
		const expression = this.props.expression
		let validExpression = true
		let header;
		header = expression.parts.map((part) => {
			if (part.type === "FUNCTION") {
				validExpression = false
				return null
			} else if (part.type === "FIELD") {
				if (r.getFieldValue(part.jimuFieldName)) {
					return r.getFieldValue(part.jimuFieldName).toString()
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
			return "Invalid header (includes function or unsupported operator)"
		}
	}

    getFieldAlias(r, f) {
		const fieldAlias = r.feature.layer.fields.find((field) => field.name === f).alias
		return fieldAlias
	}

    render() {
        const id = this.props.useDataSource.dataSourceId
        const ds = this.props.useDataSource.dataSource
        const r = this.props.record
        const selectedFeatures = {}
        selectedFeatures[id] = [r]

        // The render function will return a card component for each selected feature
        return (
            <Card className="my-3">
                <CardHeader className="p-3">
                    <div className="d-flex flex-row justify-content-between">
                        <h5 className="m-0">{this.getRecordHeader(r)}</h5>
                        <div className="d-flex flex-row">
                            {this.props.permissions.write ?
                                <Tooltip
                                    onClose={function noRefCheck(){}}
                                    onOpen={function noRefCheck(){}}
                                    placement="bottom-end"
                                    title="Upload new document attached to this feature"
                                >
                                    <Button
                                        type="tertiary"
                                        size="sm"
                                        icon
                                        className="mr-2"
                                        onClick={() => this.setState({uploading: true})}
                                    >
                                        <AddPageOutlined />
                                    </Button>
                                </Tooltip>
                            : null}
                            <Tooltip
                                onClose={function noRefCheck(){}}
                                onOpen={function noRefCheck(){}}
                                placement="bottom-end"
                                title="Deselect this feature"
                            >
                                <Button
                                    type="tertiary"
                                    size="sm"
                                    icon
                                    onClick={() => this.props.deselectFeature()}
                                >
                                    <MinusCircleOutlined />
                                </Button>
                            </Tooltip>
                        </div>	
                    </div>
                    {this.props.useDataSource.fields ? this.props.useDataSource.fields.map((f) =>
                        f !== "GlobalID" ?
                            <div>
                            {this.getFieldAlias(r, f)}: {r.getFieldValue(f)}
                        </div> : null
                    ) : null}
                    <div>
                        Data Source: {ds.layerDefinition.name}
                    </div>
                </CardHeader>
                <CardBody className={`${this.props.documents.length > 0 ? "py-0" : "py-3"}`}>
                    {this.props.loading ? 
                        <div
                            style={{
                                height: "50px",
                                position: "relative",
                                width: "100%"
                            }}
                        >
                            <Loading type="DONUT" />
                        </div> :
                        this.props.documents.length > 0 ?
                            <DocumentList
                                documents={this.props.documents}
                                featureLabel={this.getRecordHeader(r)}
                                setInfoModalDocument={doc => this.props.setInfoModalDocument(doc)}
                                setDeletingDocument={doc => this.props.setDeletingDocument(doc)}
                                useDataSources={null}
                                permissions={this.props.permissions}
                            />
                        : "No documents attached to this feature"
                    }
                </CardBody>
                {this.state.uploading ?
                    <UploadModal
						cancelUpload={() => this.setState({
							uploading: false
						})}
						selectedFeatures={selectedFeatures}
                        documentTags={this.props.documentTags}
                        graphClient={this.props.graphClient}
                        driveItemRootUrl={this.props.driveItemRootUrl}
						driveItemRootId={this.props.driveItemRootId}
                        queryDocuments={(eTag) => this.props.queryDocuments(eTag)}
                    />
                : null}
            </Card>
        )
    }
}