/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { AdvancedSelect, Button, Label, TextInput, TextArea, Row } from 'jimu-ui';
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'

interface Props {
    documentTags: any
    selectedTags: any
    updateDocumentInfo: any
    documentTitle: any
    documentDescription: any
    upload: any
}

export default class DocumentInfoForm extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            documentTitle: null,
            documentDescription: null,
            selectedTags: null
        };
    };

    deselectTag(t) {
        let selectedTags = this.state.selectedTags.filter(tag => tag !== t)
        this.setState({
            selectedTags: selectedTags
        })
        this.props.updateDocumentInfo({
            selectedTags: selectedTags
        })
    }

    componentDidMount() {
        this.setState({
            documentTitle: this.props.documentTitle,
            documentDescription: this.props.documentDescription,
            selectedTags: this.props.selectedTags
        })
    }

    render() {
        return (
            <form>
                {this.props.upload ?
                    <TextInput className="mb-4"
                        onAcceptValue={function noRefCheck() { }}
                        type="file"
                        required
                        onChange={e => this.props.updateDocumentInfo({file: e.target.files[0]})}
                    />
                : null}
                <Label
                    className="mt-0"
                    style={{
                        fontSize: "16px",
                        fontWeight: "500"
                    }}
                >
                    Title
                </Label>
                <TextInput
                    placeholder="Enter a title for the document"
                    allowClear
                    required
                    defaultValue={this.props.documentTitle}
                    onChange={e => this.props.updateDocumentInfo({ documentTitle: e.target.value })}
                />
                <Label
                    className="mt-4"
                    style={{
                        fontSize: "16px",
                        fontWeight: "500"
                    }}
                >
                    Description
                </Label>
                <TextArea
                    style={{
                        resize: "none"
                    }}
                    placeholder="Enter a description for the document"
                    height={100}
                    maxLength={255}
                    required
                    defaultValue={this.state.documentDescription}
                    onChange={e => {
                        this.props.updateDocumentInfo({ documentDescription: e.target.value })
                        this.setState({documentDescription: e.target.value})
                    }}
                />
                <Row className="mx-0 mt-1">
                    Remaining characters: {this.state.documentDescription ? 255 - this.state.documentDescription.length : 255}
                </Row>
                <Label
                    className="mt-4"
                    style={{
                        fontSize: "16px",
                        fontWeight: "500"
                    }}
                >
                    Tags
                </Label>
                <AdvancedSelect
                    staticValues={this.props.documentTags}
                    selectedValues={this.state.selectedTags}
                    onChange={e => {
                        this.props.updateDocumentInfo({ selectedTags: e })
                        this.setState({selectedTags: e})
                    }}
                    isMultiple
                    hideBottomTools
                />
                {this.props.selectedTags ?
                    <div className="d-flex flex-wrap mt-2">
                        {this.props.selectedTags.map((t) =>
                            <div
                                style={{
                                    borderRadius: "10px",
                                    margin: "5px 5px 5px 0px",
                                    padding: "5px 10px",
                                    background: "#D0544E",
                                    color: "#FFFFFD"
                                }}
                            >
                                {t.value}
                                <CloseOutlined
                                    className="ml-2 p-0"
                                    size={11}
                                    style={{
                                        cursor: "pointer"
                                    }}
                                    onClick={() => this.deselectTag(t)}
                                />
                            </div>
                        )}
                    </div>
                : null}
            </form>
        )
    }
}