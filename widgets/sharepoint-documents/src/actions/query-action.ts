import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  StringSelectionChangeMessage,
  DataRecordsSelectionChangeMessage
} from 'jimu-core';
import {v4 as uuidv4} from 'uuid';


export default class QueryAction extends AbstractMessageAction {
  filterMessageType(messageType: MessageType, messageWidgetId?: string): boolean {
    return [MessageType.DataRecordsSelectionChange].indexOf(messageType) > -1;
  }

  filterMessage(message: Message): boolean {
    return true;
  }

  //set action setting uri
  getSettingComponentUri(messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/query-action-setting';
  }

  onExecute(message: Message, actionConfig?: any): Promise<boolean> | boolean {
    const flatDataSources = {};
    actionConfig.useDataSources.forEach(ds => {
      flatDataSources[ds.dataSourceId] = ds.fields.length === 1 ? ds.fields[0] : 'GLOBALID'
    })

    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'selectedObjects',
      message.records.map(r => {
        const dataSourceId = r.dataSource.belongToDataSource ? r.dataSource.belongToDataSource.id : r.dataSource.id
        const field = flatDataSources[dataSourceId];
        return {
          UNIQUE_ID: r.feature.attributes[field].replace('{', '').replace('}', ''),
          attributes: r.feature.attributes,
          DEFAULT_LABEL_FIELD: r.feature.layer.displayField,
          SOURCE_LAYER_TITLE: r.feature.layer.title,
          DATASOURCE_ID: dataSourceId
        }
      })));
    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'selectionId', uuidv4()));

    // }
    return true;
  }
}
