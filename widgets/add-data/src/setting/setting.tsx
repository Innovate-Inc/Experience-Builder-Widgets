/** @jsx jsx */
/* eslint-disable */

import { React, jsx, getAppStore, IMState } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { MapWidgetSelector } from "jimu-ui/advanced/setting-components";
import { MultiSelect, Select, Option } from "jimu-ui";

export default class Setting extends React.PureComponent<AllWidgetSettingProps<any>, any> {

    // static mapExtraStateProps = (state: IMState) => {
    //     return {
    //         appMode: state && state.appRuntimeInfo && state.appRuntimeInfo.appMode
    //     };
    // };

    onMapWidgetSelected = (useMapWidgetIds: string[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        });
    };

    componentWillMount() {
        let selectedScopes = this.props.config.selectedScopes
        let defaultScope = this.props.config.defaultScope
        // let requireAuth = this.props.config.requireAuth
        this.setState({
            selectedScopes: selectedScopes,
            defaultScope: defaultScope
        })
    }

    render() {

        return <div className="add-data-setting">
            <div className="m-4">
                <label>Select the map to be used with this widget:</label>
                <MapWidgetSelector
                    onSelect={this.onMapWidgetSelected}
                    useMapWidgetIds={this.props.useMapWidgetIds}
                />
            </div>
            <div className="m-4">
                <label>Select the allowed scopes to be used with this widget:</label>
                <MultiSelect
                    onClickItem={(evt, value) => {
                        let selectedScopes = [...this.state.selectedScopes];
                        if (selectedScopes.includes(value)) {
                            selectedScopes.splice(selectedScopes.findIndex(d => d === value), 1)
                        } else {
                            selectedScopes.push(value)
                        }
                        this.props.onSettingChange({
                            id: this.props.id,
                            config: this.props.config.set('selectedScopes', selectedScopes)
                        })
                        this.setState({selectedScopes: selectedScopes})
                        if (selectedScopes.length === 1) {
                            this.setState({defaultScope: selectedScopes[0]})
                        }
                    }}
                    placeholder="Select one or more scopes"
                    items={this.props.config.scopeOptions}
                    defaultValues={this.props.config.selectedScopes}
                />
            </div>
            <div className="m-4">
                <label>Select the default scope to display with this widget:</label>
                <Select
                    disabled={this.state.selectedScopes.length === 0}
                    onChange={(evt, option) => {
                        let defaultScope = option.props.value
                        this.props.onSettingChange({
                            id: this.props.id,
                            config: this.props.config.set('defaultScope', defaultScope)
                        })
                        this.setState({defaultScope: defaultScope})
                    }}
                    placeholder="Select a default scope"
                    value={this.state.defaultScope}
                >
                    {this.state.selectedScopes && this.state.selectedScopes.length > 0 ? this.state.selectedScopes.map((s) =>
                        <Option
                            value={s}
                        >
                            {s}
                        </Option>
                    ) : null}
                </Select>
            </div>
            {/* <div className="m-4">
                <label>Require users to authenticate?</label>
                <Select
                    onChange={(evt, option) => {
                        let requireAuth = option.props.value
                        this.props.onSettingChange({
                            id: this.props.id,
                            config: this.props.config.set('requireAuth', requireAuth)
                        })
                        this.setState({requireAuth: requireAuth})
                    }}
                    value={this.state.requireAuth}
                >
                    <Option value={false}>No</Option>
                    <Option value={true}>Yes</Option>
                </Select>
            </div> */}
        </div>
    }
}
