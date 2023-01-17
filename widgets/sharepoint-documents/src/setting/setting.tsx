import {
  React,
  Immutable,
  IMFieldSchema,
  UseDataSource,
  DataSource,
  DataSourceTypes,
  DataSourceManager
} from 'jimu-core';
import {AllWidgetSettingProps} from 'jimu-for-builder';
import {FieldSelector} from 'jimu-ui/advanced/data-source-selector';
import {DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';
import {Button, TextArea} from 'jimu-ui';
import {ExpressionBuilderPopup} from 'jimu-ui/advanced/expression-builder';
import {SettingCollapse} from 'jimu-ui/advanced/setting-components';

export interface Config {
  useDataSources: Immutable<UseDataSource[]>
}

interface State {
  currentDS: any
  expressionOpen: boolean
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<Config>, State> {
  supportedTypes = Immutable([DataSourceTypes.FeatureLayer]);

  state = {currentDS: null, expressionOpen: false};
  currentExpression = null

  constructor(props) {
    super(props)
  }

  updateConfigProperty(property, value) {
    let settings = {
      id: this.props.id,
      config: this.props.config
    }

    settings.config[property] = value
    // settings[property] = value;
    this.props.onSettingChange(settings);
  }

  onDataSourceChange = (useDataSources: UseDataSource[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useDataSources: useDataSources
    });
  }

  getLayerName = (dsId) => {
    return DataSourceManager.getInstance().getDataSource(dsId) !== undefined
      ? DataSourceManager.getInstance().getDataSource(dsId).getLabel()
      : ''
  }

  toggleExpression = (ds?) => () => {
    if (ds) {
      this.currentExpression = ds.expression
      this.setState({
        currentDS: Immutable([ds]),
        expressionOpen: true
      })
    } else {
      this.setState({expressionOpen: false})
    }
  }

  setExpression = (expression) => {
    const currentDataSource = this.state.currentDS[0];
    const useDataSources = this.props.useDataSources.map(d => {
      if (d.dataSourceId === currentDataSource.dataSourceId) {
        d.expression = expression;
        currentDataSource.expression = expression;
      }
      return d;
    })
    this.currentExpression = expression;
    this.props.onSettingChange({
      id: this.props.id,
      useDataSources
    })
  }

  render() {
    return <div className="p-2">
      {/*{this.props.listUrl}<br/>*/}
      {/*{this.props.driveItemRootUrl}<br/>*/}
      {/*{this.props.relationshipListUrl}*/}
      <DataSourceSelector
        types={this.supportedTypes}
        useDataSources={this.props.useDataSources}
        onChange={this.onDataSourceChange}
        widgetId={this.props.id}
        isMultiple={true}
        mustUseDataSource={true}
      />
      {this.props.useDataSources?.map(ds => {
        return <div style={{marginTop: '15px'}}>
          <Button onClick={this.toggleExpression(ds)}>Set Label for {this.getLayerName(ds.dataSourceId)}</Button>
        </div>
      })}
      <ExpressionBuilderPopup
        useDataSources={this.state.currentDS}
        types={["ATTRIBUTE", "EXPRESSION"]}
        isOpen={this.state.expressionOpen}
        onClose={this.toggleExpression()}
        onChange={this.setExpression}
        expression={this.currentExpression}
      />
      <br/>
      <h4>Sharepoint Settings</h4>

      <TextArea placeholder='Client ID' value={this.props.config.clientId}
                onChange={e => this.updateConfigProperty('clientId', e.target.value)}/>
      <TextArea placeholder='Tenant ID' value={this.props.config.tenantId}
                onChange={e => this.updateConfigProperty('tenantId', e.target.value)}/>
      <TextArea placeholder='Site ID' value={this.props.config.siteId}
                onChange={e => this.updateConfigProperty('siteId', e.target.value)}/>
      <TextArea placeholder='List ID' value={this.props.config.listId}
                onChange={e => this.updateConfigProperty('listId', e.target.value)}/>
      <TextArea placeholder='Drive ID' value={this.props.config.driveId}
                onChange={e => this.updateConfigProperty('driveId', e.target.value)}/>
      <TextArea placeholder='DriveItem Root ID' value={this.props.config.driveItemRootId}
                onChange={e => this.updateConfigProperty('driveItemRootId', e.target.value)}/>
      <TextArea placeholder='Relationship List ID' value={this.props.config.relationshipListId}
                onChange={e => this.updateConfigProperty('relationshipListId', e.target.value)}/>
      <TextArea placeholder='Permissions List ID' value={this.props.config.permissionsListId}
                onChange={e => this.updateConfigProperty('permissionsListId', e.target.value)}/>
    </div>
  }
}
