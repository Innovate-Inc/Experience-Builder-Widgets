/** @jsx jsx */
import {
  React,
  jsx,
  ActionSettingProps,
  ImmutableObject,
  IMFieldSchema,
  getAppStore,
  Immutable,
  UseDataSource,
  IMUseDataSource,
  DataSource,
  DataSourceTypes,
  ImmutableArray
} from 'jimu-core';
import {DataSourceSelector, FieldSelector} from 'jimu-ui/advanced/data-source-selector';
import {SettingSection} from 'jimu-ui/advanced/setting-components';
import {ExpressionBuilder} from 'jimu-ui/advanced/lib/expression-builder';

interface State {
  useDataSources: any
}

interface Config {
  useDataSource: IMUseDataSource
  useDataSources: ImmutableObject<UseDataSource[]>
}

export type IMConfig = ImmutableObject<Config>;

class SharepointDocumentsActionSetting extends React.PureComponent<ActionSettingProps<IMConfig>, State> {
  supportedTypes = Immutable([DataSourceTypes.FeatureLayer]);

  static defaultProps = {
    config: Immutable({
      useDataSource: null
    })
  }

  /**
   * Returns the init config.The config contains the useDataSource attribute.
   * Gets the value of useDataSource: Returns its DataSource if it has been specified.
   * If not, specify the useDataSource that is already selected in the publish widget.
   */
  getInitConfig = () => {
    const widgetId = this.props.widgetId;
    const config = getAppStore().getState().appStateInBuilder.appConfig;
    const messageWidgetJson = config.widgets[widgetId];

    let useDataSources: Array<ImmutableObject<UseDataSource>> = this.props?.config?.useDataSources ? this.props.config.useDataSources : [] ;
    messageWidgetJson?.useDataSources.forEach(ds => {
      if (this.props?.config?.useDataSources?.find(d => d.dataSourceId === ds.dataSourceId) === undefined) {
        useDataSources.push(ds)
      }
    })
    // if (!this.props.config.useDataSource) {
    //   if (messageWidgetJson && messageWidgetJson.useDataSources && messageWidgetJson.useDataSources[0] && messageWidgetJson.useDataSources.length === 1) {
    //     useDataSources = messageWidgetJson.useDataSources
    //   }
    // } else {
    //   useDataSources = this.props.config.useDataSources;
    // }

    return {
      useDataSources: useDataSources
    }
  }

  componentDidMount() {
    const initConfig = this.getInitConfig();

    this.props.onSettingChange({
      actionId: this.props.actionId,
      config: this.props.config.set('useDataSources', initConfig.useDataSources)
    });

    this.setState({
      useDataSources: initConfig.useDataSources
    });

    // const useDataSources = this.getDsSelectorSourceData(this.props.widgetId)
    // this.setState({
    //   useDataSources: Immutable(useDataSources)
    // })
  }

  /**
   * Get the selected DataSource from subscribe-widget through widgetId.
   *
   * @param widgetId The id of the widget that listens to for the message.
   */
  getDsSelectorSourceData = (widgetId: string) => {
    const appConfig = getAppStore().getState()?.appStateInBuilder?.appConfig;
    const widgetJson = appConfig?.widgets?.[widgetId];
    const dsSelectorSource = widgetJson && widgetJson.useDataSources;
    return dsSelectorSource;
  }

  /**
   * Select the fields to query in subscribe-widget.
   */
    // onFieldSelected = (allSelectedFields: IMFieldSchema[], ds: DataSource) => {
    //   const field = allSelectedFields[0];
    //   if (!field) {
    //     return;
    //   }
    //   if (this.props.config.useDataSource) {
    //     //Save the message action configuration to config
    //     this.props.onSettingChange({
    //       actionId: this.props.actionId,
    //       config: this.props.config.set('fieldName', field['name']).set('useDataSource', {
    //         dataSourceId: this.props.config.useDataSource.dataSourceId,
    //         mainDataSourceId: this.props.config.useDataSource.mainDataSourceId,
    //         dataViewId: this.props.config.useDataSource.dataViewId,
    //         rootDataSourceId: this.props.config.useDataSource.rootDataSourceId,
    //         fields: allSelectedFields.map(f => f.jimuName)
    //       })
    //     });
    //   }
    // }

  onFieldSelected = (allSelectedFields: IMFieldSchema[], ds: DataSource) => {
    const useDataSources = this.props.config.useDataSources.map(d => {
      if (d.dataSourceId === ds.id) {
        d.fields = allSelectedFields.map(f => f.jimuName);
      }
      return d;
    })
    this.props.onSettingChange({
      actionId: this.props.widgetId,
      config: this.props.config.set('useDataSources', useDataSources)
    });
    this.setState({
      useDataSources: Immutable(useDataSources)
    })
  }

  // onDataSourceChange = (useDataSources) => {
  //   this.props.onSettingChange({
  //     actionId: this.props.widgetId,
  //     config: this.props.config.set('useDataSources', useDataSources)
  //   });
  //   this.setState({
  //     useDataSources: Immutable(useDataSources)
  //   })
  // }

  render() {
    return <div>
      {this.state?.useDataSources?.map(ds => {
        return <SettingSection>
          {
            <div className="mt-2">Please choose a Field to query:
              <FieldSelector
                useDataSources={Immutable([ds])}
                onChange={this.onFieldSelected}
                useDropdown={true}
                placeholder='Select GlobalID Field'
                useSelectionDataView={false}
                usePopulatedDataView={true}
                selectedFields={ds.fields ? ds.fields : Immutable([])}
              />
            </div>
          }
        </SettingSection>
      })}

    </div>;
  }
}

export default SharepointDocumentsActionSetting;
