import { React } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { Label } from 'jimu-ui';
import { SettingSection, SettingRow, MapWidgetSelector } from 'jimu-ui/advanced/setting-components';


export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {
    
    state = {
        // useDataSources: null,
        useMapWidgetIds: null
    }

    static getDerivedStateFromProps(props, state) {
        const newState = {}
        // if (props.useDataSources !== state.useDataSources) {
        //     newState["useDataSources"] = props.useDataSources
        // }
        if (props.useMapWidgetIds !== state.useMapWidgetIds) {
            newState["useMapWidgetIds"] = props.useMapWidgetIds
        }

        return newState
    }
    
    // supportedDataSourceTypes = Immutable([DataSourceTypes.FeatureLayer]);

    // onSelectDataSource = (useDataSources: UseDataSource[]) => {
    //     this.props.onSettingChange({
    //         id: this.props.id,
    //         useDataSources: useDataSources
    //     });
    // }

    onSelectMapWidget = (useMapWidgetIds) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        });
    }

    render() {
        return <div>
            <SettingSection>
                {/* <SettingRow className="mt-2">
                    <Label><h4>Select a Data Source</h4></Label>
                </SettingRow>
                <SettingRow>
                    <DataSourceSelector
                        types={this.supportedDataSourceTypes}
                        useDataSources={this.state.useDataSources}
                        onChange={this.onSelectDataSource}
                        widgetId={this.props.id}
                        isMultiple={false}
                        mustUseDataSource={true}
                    />
                </SettingRow> */}
                <SettingRow className="mt-2">
                    <Label><h4>Select a Map Widget</h4></Label>
                </SettingRow>
                <SettingRow>
                <MapWidgetSelector
                    onSelect={this.onSelectMapWidget}
                    useMapWidgetIds={this.state.useMapWidgetIds}
                />
                </SettingRow>
            </SettingSection>
        </div>
    }
}
