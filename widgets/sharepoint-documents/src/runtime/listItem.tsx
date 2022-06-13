import {React} from 'jimu-core';

export class ListItem extends React.PureComponent<{ title: string }> {
    render() {
        return <div style={{
            display:"block",
            width:"100%",
            overflow:"hidden",
            whiteSpace:"nowrap",
            textOverflow:"ellipsis"
        }}>{this.props.title}</div>
    }
}