/** @jsx jsx */
/* eslint-disable */

import { React, jsx, getAppStore, IMState } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { JimuMapViewSelector } from "jimu-ui/advanced/setting-components";
import { MultiSelect, Input } from "jimu-ui";

export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {

    // static mapExtraStateProps = (state: IMState) => {
    //     return {
    //         appMode: state && state.appRuntimeInfo && state.appRuntimeInfo.appMode
    //     };
    // };
    
    render() {

        return <div className="add-data-setting">
            <div className="m-4">
                <label>Select the map to be used with this widget:</label>
                <JimuMapViewSelector
                    useMapWidgetIds={this.props.useMapWidgetIds}
                    onSelect={useMapWidgetIds => {
                        this.props.onSettingChange({
                            id: this.props.id,
                            useMapWidgetIds: useMapWidgetIds,
                        });
                    }}
                />
            </div>
            <div className="m-4">
                <label>Select the allowed scopes to be used with this widget:</label>
                <MultiSelect
                    onClickItem={(evt, value) => {
                        let checked = evt.target['checked'];
                        let selectedScopes = this.props.config.selectedScopes;
                        if (checked && !selectedScopes.includes(value)) {
                            selectedScopes.push(value)
                        } else if (!checked && selectedScopes.includes(value)) {
                            let i = selectedScopes.findIndex(d => d == value)
                            selectedScopes.splice(i, 1)
                        }
                        this.props.onSettingChange({
                            id: this.props.id,
                            config: this.props.config.set('selectedScopes', selectedScopes)
                        })
                    }}
                    placeholder="Select one or more scopes"
                    items={this.props.config.scopeOptions}
                    defaultValues={this.props.config.selectedScopes}
                />
            </div>
        </div>;
    }
}
