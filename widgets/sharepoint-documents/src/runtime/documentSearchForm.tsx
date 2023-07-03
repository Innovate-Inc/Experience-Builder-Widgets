/** @jsx jsx */

import { React, jsx } from 'jimu-core';
import { AdvancedSelect, Button, Label, TextInput, TextArea, Row, Col } from 'jimu-ui';
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
import { SearchOutlined } from 'jimu-icons/outlined/editor/search'

interface Props {
    documentTags: any
    updateDocumentFilters: any
    documentFilters: any
    creatorList: any
}

export default class DocumentSearchForm extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            selectedTags: [],
            documentFilters: {}
        };
    };

    static getDerivedStateFromProps(props, state) {
        
        return {
            documentFilters: props.documentFilters
        }
    }

    deselectTag(t) {
        let filters = {...this.state.documentFilters}
        filters.tags = filters.tags.filter(tag => tag !== t)
        this.props.updateDocumentFilters(filters)
    }
    
    checkInputValidity(value, field) {
        const validityResult = {
            valid: true
        }
        switch (field) {
            case "endDate":
                if (this.state.documentFilters.startDate) {
                    validityResult.valid = new Date(value) >= new Date(this.state.documentFilters.startDate)
                    if (validityResult.valid === false) {
                        validityResult["msg"] = "End date must be after the start date"
                    }
                }
                break;
            case "startDate":
                if (this.state.documentFilters.endDate) {
                    validityResult.valid = new Date(value) <= new Date(this.state.documentFilters.endDate)
                    if (validityResult.valid === false) {
                        validityResult["msg"] = "Start date must be before the end date"
                    }
                }
        }
        return validityResult
    }

    getDateForMinMax(d) {
        const date = new Date(d)
        let year, month, day
        year = date.getFullYear()
        if (date.getMonth() < 9) {
            month = `0${date.getMonth() + 1}`
        } else {
            month = (date.getMonth() +1 ).toString()
        }
        if (date.getDate() < 10) {
            day = `0${date.getDate()}`
        } else {
            day = date.getDate().toString()
        }
        return `${year}-${month}-${day}`
    }

    render() {
        return (
            <form className="pt-3">
                <TextInput
                    allowClear
                    placeholder="Search for documents"
                    prefix={<SearchOutlined size="s" />}
                    onChange={e => {
                        let filters = {...this.state.documentFilters}
                        filters.searchText = e.target.value
                        this.props.updateDocumentFilters(filters)
                    }}
                />
                <Label
                    className="mt-4"
                    style={{
                        fontSize: "16px",
                        fontWeight: "500"
                    }}
                >
                    Uploaded Date Range
                </Label>
                <Row className="p-0 m-0">
                    <TextInput
                        allowClear
                        className="flex-fill"
                        type="date"
                        checkValidityOnChange={(value) => this.checkInputValidity(value, "startDate")}
                        onChange={e => {
                            let filters = {...this.state.documentFilters}
                            if (e.target.valueAsDate) {
                                filters.startDate = e.target.valueAsDate.toUTCString()
                            } else {
                                filters.startDate = null
                            }
                            this.props.updateDocumentFilters(filters)
                        }}
                    />
                    <span
                        className="align-self-center px-3"
                        style={{
                            fontSize: "14px"
                        }}
                    >
                        to
                    </span>
                    <TextInput
                        allowClear
                        className="flex-fill"
                        type="date"
                        checkValidityOnChange={(value) => this.checkInputValidity(value, "endDate")}
                        onChange={e => {
                            let filters = {...this.state.documentFilters}
                            if (e.target.valueAsDate) {
                                let endDate = e.target.valueAsDate.toUTCString()
                                filters.endDate = endDate
                            } else {
                                filters.endDate = null
                            }
                            this.props.updateDocumentFilters(filters)
                        }}
                    />
                </Row>
                
                <Row className="p-0 m-0">
                    <Col className="p-0 pr-2 m-0">
                        <Label
                            className="mt-4"
                            style={{
                                fontSize: "16px",
                                fontWeight: "500"
                            }}
                        >
                            Created By
                        </Label>
                        <AdvancedSelect
                            staticValues={this.props.creatorList}
                            selectedValues={this.state.documentFilters.creators}
                            onChange={e => {
                                let filters = {...this.state.documentFilters}
                                filters.creators = e
                                this.props.updateDocumentFilters(filters)
                            }}
                            isMultiple
                            hideBottomTools
                        />
                    </Col>
                    <Col className="p-0 pl-2 m-0 mb-3">
                        <Label
                            className="mt-4"
                            style={{
                                fontSize: "16px",
                                fontWeight: "500"
                            }}
                        >
                            Document Tags
                        </Label>
                        <AdvancedSelect
                            staticValues={this.props.documentTags}
                            selectedValues={this.state.documentFilters.tags}
                            onChange={e => {
                                let filters = {...this.state.documentFilters}
                                filters.tags = e
                                this.props.updateDocumentFilters(filters)
                            }}
                            isMultiple
                            hideBottomTools
                        />
                    </Col>
                </Row>
            </form>
        )
    }
}