import { React, Immutable, ImmutableObject, UseDataSource, DataSourceTypes, DataSourceManager, DataSourceComponent, IMFieldSchema } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { DataSourceSelector, FieldSelector } from 'jimu-ui/advanced/data-source-selector';
import { Button, TextInput, Label } from 'jimu-ui';
import { ExpressionBuilderPopup, ExpressionBuilderType } from 'jimu-ui/advanced/expression-builder';
import { SettingCollapse, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';

export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {
    
    state = {
        selectedDataSource: null,
        expressionBuilderPopupOpen: false,
        useDataSources: null,
        dataSourceManager: null
    }

    static getDerivedStateFromProps(props, state) {
        if (props.config.useDataSources !== state.useDataSources) {
            return {
                useDataSources: props.config.useDataSources
            }
        }
        return null
    }
    
    supportedDataSourceTypes = Immutable([DataSourceTypes.FeatureLayer]);
    expressionTypes = Immutable([ExpressionBuilderType.Attribute, ExpressionBuilderType.Expression])

    onSelectDataSource = (useDataSources: UseDataSource[]) => {
        let config = {...this.props.config}
        config.useDataSources = useDataSources
        this.props.onSettingChange({
            id: this.props.id,
            config: config
        });
    }

    onFieldChange = (allSelectedFields: IMFieldSchema[], ds) => {
        const useDataSource = this.props.config.useDataSources.find(d => d.dataSourceId === ds.id)
        const updatedDataSource: UseDataSource = {...useDataSource, fields: allSelectedFields.map(f => f.jimuName)}
        let index = this.props.config.useDataSources.findIndex(d => d.dataSourceId === ds.id)
        const useDataSources = [...this.props.config.useDataSources]
        useDataSources[index] = updatedDataSource
        let config = {...this.props.config}
        config.useDataSources = useDataSources
        this.props.onSettingChange({
            id: this.props.id,
            config: config
        })
    }

    onSharepointSettingChange = (e, key) => {
        const newValue = e.target.value
        let config = {...this.props.config}
        config.sharePointSettings[key] = newValue
        this.props.onSettingChange({
            id: this.props.id,
            config: config
        })
    }

    updateDataSourceExpression = (exp) => {
        const dsId = this.state.selectedDataSource.dataSourceId
        const useDataSource = this.props.config.useDataSources.find(d => d.dataSourceId === dsId)
        let index = this.props.config.useDataSources.findIndex(d => d.dataSourceId === dsId)

        const updatedDataSource: UseDataSource = {...useDataSource}
        updatedDataSource["expression"] = exp
        const useDataSources = [...this.props.config.useDataSources]
        useDataSources[index] = updatedDataSource
        let config = {...this.props.config}
        config.useDataSources = useDataSources
        this.props.onSettingChange({
            id: this.props.id,
            config: config
        })
        this.setState({
            selectedDataSource: updatedDataSource
        })
    }

    getDataSourceName = (d: ImmutableObject<UseDataSource>) => {
        const dsm = this.state.dataSourceManager
        let label = ""
        if (dsm) {
            label = dsm.getDataSource(d.dataSourceId).getLabel()
        }
        return label
    }

    getDataSourceExpression = (ds=null) => {
        let expression
        if (ds) {
            expression = ds.expression
            let parts = expression.parts.map((p) => p.exp)
            return parts.join("")
        } else {
            expression = this.state.selectedDataSource.expression
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
                </SettingCollapse>
            </SettingSection>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">Feature Headings</h4>}>
                    {this.state.useDataSources ? <SettingRow className="pt-4">
                        Select a field or expression as a heading for each selected feature. Note that functions and operators other than "+" used to concatenate text are not supported.
                    </SettingRow> : null }
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
                                    {ds.expression ? this.getDataSourceExpression(ds) : "Set attribute or expression"}
                                </Button>
                            </SettingRow>
                        </DataSourceComponent>
                    )}
                    <ExpressionBuilderPopup
                        useDataSources={Immutable([this.state.selectedDataSource])}
                        types={this.expressionTypes}
                        isOpen={this.state.expressionBuilderPopupOpen}
                        onClose={() => this.setState({expressionBuilderPopupOpen: false})}
                        onChange={this.updateDataSourceExpression}
                        expression={this.state.selectedDataSource ? this.getDataSourceExpression() : ""}
                    />

                </SettingCollapse>
            </SettingSection>
            <SettingSection>
                <SettingCollapse label={<h4 className="m-0">Feature Data</h4>}>
                    {this.state.useDataSources ? <SettingRow className="pt-4">
                            Select any additional fields to display for each selected feature.
                        </SettingRow> : null }
                    {this.state.useDataSources?.map(ds => 
                        <DataSourceComponent useDataSource={ds}>
                            <SettingRow className="p-0">
                                <Label className="font-weight-bold">{this.getDataSourceName(ds)}</Label>
                            </SettingRow>
                            <SettingRow className="mt-1 p-0">
                                <FieldSelector
                                    useDataSources={Immutable([ds])}
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
