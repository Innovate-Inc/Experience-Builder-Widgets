/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { Container, Row, Button, Tooltip } from 'jimu-ui';
import { LaunchOutlined } from 'jimu-icons/outlined/editor/launch'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'

interface Props {
    documents: any
    featureLabel: any
    setInfoModalDocument: any
    setDeletingDocument: any
    useDataSources: any
    permissions: any
}

export default class DocumentList extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
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

    render() {
        return (
            <Container className="m-0 p-0">
                {this.props.documents.map((d, i) =>
                    <Row className={`m-0 px-0 py-3 ${i !== 0 ? "border-top border-light-900" : null}`}>
                        <div className="d-flex flex-row justify-content-between flex-fill">
                            <h6 className="m-0">{d.fields.Title ? d.fields.Title : d.fields.LinkFilename}</h6>
                            <div>
                                <div className="d-flex flex-row">
                                    <Tooltip
                                        onClose={function noRefCheck() { }}
                                        onOpen={function noRefCheck() { }}
                                        placement="bottom-end"
                                        title="View document info"
                                    >
                                        <Button
                                            type="tertiary"
                                            size="sm"
                                            icon
                                            className="mr-2"
                                            onClick={() => this.props.setInfoModalDocument(d)}
                                        >
                                            <InfoOutlined />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip
                                        onClose={function noRefCheck() { }}
                                        onOpen={function noRefCheck() { }}
                                        placement="bottom-end"
                                        title="Open document in a new tab"
                                    >
                                        <Button
                                            type="tertiary"
                                            size="sm"
                                            icon
                                            className="mr-2"
                                            href={d.webUrl}
                                            target="_blank"
                                        >
                                            <LaunchOutlined />
                                        </Button>
                                    </Tooltip>

                                    {this.props.permissions.delete ?
                                        <Tooltip
                                            onClose={function noRefCheck() { }}
                                            onOpen={function noRefCheck() { }}
                                            placement="bottom-end"
                                            title="Delete this document"
                                        >
                                            <Button
                                                type="tertiary"
                                                size="sm"
                                                icon
                                                onClick={(() =>  this.props.setDeletingDocument(d))}
                                            >
                                                <TrashOutlined />
                                            </Button>
                                        </Tooltip>
                                    : null}
                                </div>
                            </div>
                        </div>
                        <div className="w-100 mt-1">
                            {this.getMetaData(d)}
                        </div>
                        {d.fields.Tags ?
                            <div className="d-flex flex-wrap mt-1 w-100">
                                {d.fields.Tags.map((t) => 
                                    <div className="sharepoint-widget__badge">
                                        {t}
                                    </div>
                                )}
                            </div>
                        : null}
                        <div className="mt-1">
                            {this.props.useDataSources ? <span className="font-weight-bold">{this.countAllRelatedFKs(d.fields.FeatureFKs) ? "Related: " : "No related features"}</span> : null}
                            {this.props.useDataSources && this.countAllRelatedFKs(d.fields.FeatureFKs) ? this.props.useDataSources.filter(ds => this.compareFKs(ds.relatedFeatures, d.fields.FeatureFKs) > 0).map(ds => {
                                const fkMatchCount = this.compareFKs(ds.relatedFeatures, d.fields.FeatureFKs)
                                return <span>{ds.dataSource.layerDefinition.name} ({fkMatchCount} feature{fkMatchCount > 1 ? "s" : null})</span>
                            }).reduce((a, b) => [a, ", ", b]) : null}
                        </div>
                    </Row>
                )}
            </Container>
        )
    }
}