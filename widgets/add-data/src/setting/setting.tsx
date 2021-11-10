/** @jsx jsx */
import { React, jsx, getAppStore } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { JimuMapViewSelector } from "jimu-ui/advanced/setting-components";

export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {

    onMapWidgetSelected = (useMapWidgetIds: string[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        });
    };

    render() {
        const widgets = getAppStore().getState().appConfig.widgets;
        return <div className="add-data-setting">
            <div className="m-4">
                <label>Select the map to be used with this widget:</label>
                <JimuMapViewSelector
                    useMapWidgetIds={this.props.useMapWidgetIds}
                    onSelect={this.onMapWidgetSelected}
                />
            </div>
        </div>;
    }
}
