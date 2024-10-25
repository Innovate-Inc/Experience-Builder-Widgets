import { React, Immutable, ImmutableObject, UseDataSource, DataSourceTypes, DataSourceManager, DataSourceComponent, IMFieldSchema, DataSource, FieldSchema, Expression, ImmutableArray } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { DataSourceSelector, FieldSelector } from 'jimu-ui/advanced/data-source-selector';
import { Button, TextInput, Label } from 'jimu-ui';
import { ExpressionBuilderPopup, ExpressionBuilderType } from 'jimu-ui/advanced/expression-builder';
import { SettingCollapse, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';

interface WidgetState {
    selectedDataSource: any
    expressionBuilderPopupOpen: boolean
    useDataSources: ImmutableArray<UseDataSource> | undefined
    dataSourceExpressions: Array<Expression> | undefined
    dataSourceManager: DataSourceManager | undefined
    invalidSource: boolean
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {
    state: WidgetState = {
        selectedDataSource: undefined,
        expressionBuilderPopupOpen: false,
        useDataSources: undefined,
        dataSourceExpressions: undefined,
        dataSourceManager: undefined,
        invalidSource: false
    }

    static getDerivedStateFromProps(props: any, state: WidgetState) {
        if (props.config.useDataSources !== state.useDataSources) {
            return {
                useDataSources: props.config.useDataSources
            }
        }
        return null
    }

    supportedDataSourceTypes = Immutable([DataSourceTypes.FeatureLayer]);
    expressionTypes = Immutable([ExpressionBuilderType.Attribute, ExpressionBuilderType.Expression])

    onSelectDataSource = (sources: UseDataSource[]) => {
        const dsm = this.state.dataSourceManager
        let invalidSource = false
        // Check the data sources to see if it is valid for this widget. It must have the field 'GlobalID'
        for (let i = 0; i < sources.length; i++) {
            const d = sources[i]
            // get the data source from the DataSourceManager using the id
            const ds = dsm.getDataSource(d.dataSourceId)
            const fields = ds.getSchema().fields

            // If GlobalID i not found, do not update the config and display an error
            if (!fields || !('GlobalID' in fields)) {
                invalidSource = true
            }
        }
            
        if (invalidSource) {
            this.setState({
                invalidSource: true
            })
        } else {
            let config = { ...this.props.config }
            config.useDataSources = sources
            this.props.onSettingChange({
                id: this.props.id,
                config: config
            });
            this.setState({
                invalidSource: false
            })
        }

    }

    onFieldChange = (fields: IMFieldSchema[], ds: DataSource) => {
        const sources = [...this.props.config.useDataSources]
        const useDataSource = sources.find((d: UseDataSource) => d.dataSourceId === ds.id)
        useDataSource.fields = fields.map(f => f.jimuName)
        this.props.onSettingChange({
            id: this.props.id,
            config: {...this.props.config, useDataSources: sources}
        })
    }

    onSharepointSettingChange = (e, key) => {
        const newValue = e.target.value
        let config = { ...this.props.config }
        config.sharePointSettings[key] = newValue
        this.props.onSettingChange({
            id: this.props.id,
            config: config
        })
    }

    updateDataSourceExpression = (exp: Expression) => {
        if (this.state.selectedDataSource) {
            const dsId = this.state.selectedDataSource.dataSourceId
            const useDataSource = this.props.config.useDataSources.find(d => d.dataSourceId === dsId)
            let index = this.props.config.useDataSources.findIndex((d: UseDataSource) => d.dataSourceId === dsId)
            const updatedDataSource = { ...useDataSource }
            updatedDataSource["expression"] = exp
            const useDataSources = [...this.props.config.useDataSources]
            useDataSources[index] = updatedDataSource
            let config = { ...this.props.config }
            config.useDataSources = useDataSources
            this.props.onSettingChange({
                id: this.props.id,
                config: config
            })
            this.setState({
                selectedDataSource: updatedDataSource
            })
        }
    }

    getDataSourceName = (d: ImmutableObject<UseDataSource>) => {
        const dsm = this.state.dataSourceManager
        let label = ""
        if (dsm) {
            label = dsm.getDataSource(d.dataSourceId).getLabel()
        }
        return label
    }

    getDataSourceExpression = (ds: any | undefined) => {
        let expression: Expression | ImmutableObject<Expression> = {
            name: 'exp1',
            parts: []
        }
        if (ds) {
            expression = ds.expression
        } else {
            if (this.state.selectedDataSource & this.state.selectedDataSource.expression) {
                expression = this.state.selectedDataSource.expression
            }
        }
        return expression
    }

    componentDidMount() {
        const dsm = DataSourceManager.getInstance()
        dsm.createAllDataSources().then(() => {
            this.setState({
                dataSourceManager: dsm
            })
        })
    }

    render() {
        let sharePointSettings = this.props.config.sharePointSettings
        let sharePointSettingsKeys = Object.keys(sharePointSettings)
        return <div>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">Select Data Sources</h4>}>
                    <SettingRow className="pt-4">
                        <DataSourceSelector
                            types={this.supportedDataSourceTypes}
                            useDataSources={this.state.useDataSources}
                            onChange={this.onSelectDataSource}
                            widgetId={this.props.id}
                            isMultiple
                            mustUseDataSource
                        />
                    </SettingRow>
                    {this.state.invalidSource ?
                        <SettingRow>Invalid data source selected. All data sources must include a field named 'GlobalID' with a type of 'Esri Global ID.'</SettingRow>
                        :
                        null
                    }
                </SettingCollapse>
            </SettingSection>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">Feature Headings</h4>}>
                    {this.state.useDataSources ? <SettingRow className="pt-4">
                        Select a field or expression as a heading for each selected feature. Note that functions and operators other than "+" used to concatenate text are not supported.
                    </SettingRow> : null}
                    {this.state.useDataSources?.map(ds =>
                        <DataSourceComponent useDataSource={ds}>
                            <SettingRow className="p-0">
                                <Label className="font-weight-bold">{this.getDataSourceName(ds)}</Label>
                            </SettingRow>
                            <SettingRow className="mt-1 p-0">
                                <Button
                                    onClick={() => this.setState({
                                        selectedDataSource: ds,
                                        expressionBuilderPopupOpen: true
                                    })}
                                >
                                    {ds.expression ? this.getDataSourceExpression(ds).name : "Set attribute or expression"}
                                </Button>
                            </SettingRow>
                        </DataSourceComponent>
                    )}
                    <ExpressionBuilderPopup
                        useDataSources={Immutable([this.state.selectedDataSource])}
                        types={this.expressionTypes}
                        isOpen={this.state.expressionBuilderPopupOpen}
                        onClose={() => this.setState({ expressionBuilderPopupOpen: false })}
                        onChange={this.updateDataSourceExpression}
                        expression={this.getDataSourceExpression()}
                    />

                </SettingCollapse>
            </SettingSection>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">Feature Data</h4>}>
                    {this.state.useDataSources ? <SettingRow className="pt-4">
                        Select any additional fields to display for each selected feature.
                    </SettingRow> : null}
                    {this.state.useDataSources?.map(ds =>
                        <DataSourceComponent useDataSource={ds}>
                            <SettingRow className="p-0">
                                <Label className="font-weight-bold">{this.getDataSourceName(ds)}</Label>
                            </SettingRow>
                            <SettingRow className="mt-1 p-0">
                                <FieldSelector
                                    useDataSources={Immutable([ds as unknown as UseDataSource])}
                                    useDropdown
                                    isMultiple
                                    selectedFields={ds.fields || Immutable([])}
                                    onChange={this.onFieldChange}
                                ></FieldSelector>
                            </SettingRow>
                        </DataSourceComponent>
                    )}
                </SettingCollapse>
            </SettingSection>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">SharePoint Settings</h4>} >
                    {sharePointSettingsKeys.map((key) => {
                        let setting = sharePointSettings[key]
                        let value = ''
                        if (setting) {
                            value = setting
                        }
                        return <SettingSection className="p-3">
                            <SettingRow className="p-0">
                                <Label className="font-weight-bold">{key}</Label>
                            </SettingRow>
                            <SettingRow className="mt-1 p-0">
                                <TextInput
                                    defaultValue={value}
                                    onChange={(e) => this.onSharepointSettingChange(e, key)}
                                />
                            </SettingRow>
                        </SettingSection>
                    })}
                </SettingCollapse>
            </SettingSection>
        </div>
    }
}
