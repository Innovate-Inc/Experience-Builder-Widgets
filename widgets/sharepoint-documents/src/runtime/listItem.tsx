import {React} from 'jimu-core';

export class ListItem extends React.PureComponent<{ title: string }> {
    render() {
        return <div>{this.props.title}</div>
    }
}
