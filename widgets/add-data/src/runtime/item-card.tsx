/** @jsx jsx */
import { React, jsx } from 'jimu-core';
import {
    Row, Col, Image,
    Card, CardImg, CardBody, CardHeader, Button, Tooltip,
    Modal, ModalHeader, ModalBody, ModalFooter
} from 'jimu-ui';
import * as PortalItem from 'esri/portal/PortalItem';
import * as Layer from 'esri/layers/Layer';
import * as KMLLayer from 'esri/layers/KMLLayer';
import * as WFSLayer from 'esri/layers/WFSLayer';
import * as OGCFeatureLayer from 'esri/layers/OGCFeatureLayer';
import parse from 'html-react-parser';
import * as esriRequest from 'esri/request';
import { StarIcon } from '@icons/material';
interface Props {
    item: any
    jimuMapView: any
    portalUrl: any
    favorite: any
}

export default class ItemCard extends React.PureComponent<Props, any> {

    constructor(props) {
        super(props)
        this.state = {
            itemOnMap: false,
            prevItem: this.props.item,
            itemLayers: null,
            itemTables: null,
            modal: false,
            clamped: true,
            clampEnabled: false,
            // The following variable is used to dynamically update the state until the description dom node is rendered.
            // It will increment by one but the value is not used for anything
            renderCount: 0,
            favorite: this.props.favorite
        };
    };

    static getDerivedStateFromProps(props, state) {
        // Whenever the item used to build this component changes,
        // the states of itemLayers and itemTables will be reset to null.
        const item = props.item;
        if (item !== state.prevItem) {
            return {
                prevItem: item,
                itemLayers: null,
                itemTables: null,
                favorite: props.favorite
            }
        }

        return null;
    }

    toggleModal = () => {
        this.setState({ modal: !this.state.modal })
    }

    removeLayer = (evt) => {
        evt.preventDefault();

        const item = this.props.item;

        if (this.props.jimuMapView) {
            const map = this.props.jimuMapView.view.map;
            const mapItems = []
            map.layers.items.forEach(mapItem => {
                if (mapItem.portalItem && mapItem.portalItem.id && mapItem.portalItem.id === item.id) {
                    mapItems.push(mapItem)
                } else if (mapItem.url === item.url) {
                    mapItems.push(mapItem)
                }
            })

            mapItems.forEach(mapItem => {
                map.remove(mapItem)
            })
        }

        this.setState({ itemOnMap: false })
    }

    addLayer = (evt) => {
        evt.preventDefault();

        this.setState({ itemOnMap: true })

        const item = this.props.item;
        // Map is accessed through the Experience Builder JimuMapView data source
        const map = this.props.jimuMapView.view.map;

        let layer;
        // Switch on item type--most can be added using the basic layer class (default case)
        // KML, WFS, and OGCFeatureServer added through specific classes

        switch (item.type) {
            case 'KML':
                layer = new KMLLayer({ url: item.url });
                map.add(layer);
                break;

            case 'WFS':
                layer = new WFSLayer({ url: item.url, })
                map.add(layer)
                break;

            case 'OGCFeatureServer':
                layer = new OGCFeatureLayer({ url: item.url, collectionId: item.collectionId });
                map.add(layer);
                break;

            default:
                // Add the layer to the map using the Layer.fromPortalItem method
                // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-Layer.html#fromPortalItem    

                const portalItem = new PortalItem({
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    url: item.url
                })

                Layer.fromPortalItem({
                    portalItem: portalItem
                }).then(function (layer) {
                    map.add(layer);
                });
        }
    };

    favItem() {
        const item = this.props.item
        const itemId = item.id
        const portal = item.portal;
        const restUrl = portal.restUrl;
        const user = portal.user;
        const favGroupId = user.favGroupId;
        const username = user.username;
        let shareText = 'share';
        if (this.state.favorite) {
            shareText = 'unshare'
        }
        this.setState({ favorite: !this.state.favorite })
        const shareUrl = `${restUrl}/content/items/${itemId}/${shareText}?groups=${favGroupId}`
        let method = 'post' as const
        const params = {
            method: method,
            everyone: false,
            org: true,
        }
        if (portal.credential) {
            params['token'] = portal.credential.token
        }
        try {
            esriRequest(shareUrl, params)
                .then(response => { }).catch(error => { })
        } catch (error) { }

    }

    queryItemLayers() {
        // When the component is rendered with a null value for itemLayers or itemTables,
        // this function will query the item for its layers and tables. If there are none,
        // the value for those states will be set to an empty array instead of null
        const item = this.props.item;
        const params = {
            query: { f: 'json' },
            handleAs: 'json',
            callbackParamName: 'callback',
        };
        if (item.portal.credential) {
            params['token'] = item.portal.credential.token
        }
        esriRequest(`${item.url}/layers`, params)
            .then(response => {
                let layers = response.data.layers;
                let tables = response.data.tables;
                if (layers) {
                    this.setState({ itemLayers: response.data.layers })
                } else {
                    this.setState({ itemLayers: [] })
                }
                if (tables) {
                    this.setState({ itemTables: response.data.tables })
                } else {
                    this.setState({ itemTables: [] })
                }
            })
            .catch(error => { });
    };

    render() {

        const item = this.props.item;

        if (!this.state.itemLayers || !this.state.itemTables) {
            if (item.portal && item.portal.user) {
                this.queryItemLayers();
            }
        };

        const dateFormat = { year: 'numeric', month: 'long', day: 'numeric' };

        const itemDropdown = [
            { label: 'Zoom to', sel: '' },
            { label: 'Transparency', sel: '' },
            { label: 'Set visibility range', sel: '' },
            { label: 'Disable pop-up', sel: '' },
            { label: 'Move up', sel: '' },
            { label: 'Move down', sel: '' },
            { label: 'View in attribute table', sel: '' },
            { label: 'View layer details', sel: this.toggleModal },
            { label: 'Remove layer', sel: this.removeLayer }
        ]


        let descriptionNode;

        const modal = this.state.modal;
        if (modal) {
            descriptionNode = document.getElementById(`${item.id}-description`)
            if (!descriptionNode) {
                this.setState({ 'renderCount': this.state.renderCount + 1 })
            } else {
                if (descriptionNode.scrollHeight > descriptionNode.offsetHeight) {
                    this.setState({ 'clampEnabled': true })
                }
            }
        }
        let descriptionCSS = '';
        let clampIcon = 'esri-icon-up-arrow'
        let clampText = 'See less'
        const clamped = this.state.clamped;

        if (clamped) {
            descriptionCSS = 'display: -webkit-box; -webkit-line-clamp: 10; -webkit-box-orient: vertical; overflow: hidden;'
            clampIcon = 'esri-icon-down-arrow'
            clampText = 'See more'
        }

        let description;
        if (item.description) {
            description = item.description.replace(/ *style='(.*?)' *| *color='(.*?)' */g, '');
        }

        if (this.props.jimuMapView) {
            const map = this.props.jimuMapView.view.map;
            map.layers.items.forEach(mapItem => {
                if (mapItem.portalItem && mapItem.portalItem.id && mapItem.portalItem.id === item.id) {
                    this.setState({ itemOnMap: true })
                } else if (mapItem.url === item.url) {
                    this.setState({ itemOnMap: true })
                }
            })
        }

        // The render function will return a card component for each portal item available to add
        // Most components within the card below are wrapped in a conditional statement
        // If the applicable property exists for the item, the component will be added, else null
        return (
            <Card className='h-100'>
                {item.thumbnailUrl
                    ? <CardImg className='p-2' css='max-width: 100%;' top src={item.thumbnailUrl} alt={item.snippet} />
                    : null
                }
                {item.title
                    ? <CardHeader className='p-2' borderTop={true}>
                        <Tooltip title={item.title} placement='bottom'>
                            <div css='
                                font-weight: 500;
                                display: -webkit-box;
                                -webkit-line-clamp: 2;
                                -webkit-box-orient: vertical;  
                                overflow: hidden;
                                '>
                                {item.title}
                            </div>
                        </Tooltip>
                    </CardHeader>
                    : null
                }
                <CardBody className='p-2' css='font-size: 0.75rem;'>
                    {item.snippet
                        ? <Tooltip title={item.snippet} placement='bottom'>
                            <div css='
                                    display: -webkit-box;
                                    -webkit-line-clamp: 4;
                                    -webkit-box-orient: vertical;  
                                    overflow: hidden;
                                '>
                                {item.snippet}
                            </div>
                        </Tooltip>
                        : null
                    }
                    <div className='my-2' css='color: #777777;'>
                        {item.iconUrl
                            ? <img
                                src={item.iconUrl}
                                className='mr-1'
                                css='display: inline-block;'
                                height='16px'
                                width='16px'
                            />
                            : ''
                        }
                        {item.displayName
                            ? item.displayName
                            : ''
                        }
                    </div>
                </CardBody>
                <CardBody className='p-1 d-flex align-items-end'>
                    <Tooltip title={'View item details'} placement='bottom'>
                        <Button
                            size='sm'
                            className='m-1 p-2 esri-icon-description'
                            onClick={this.toggleModal}
                        />
                    </Tooltip>
                    <Tooltip title={this.state.itemOnMap ? 'Remove from map' : 'Add to map'} placement='bottom'>
                        <Button
                            size='sm'
                            className={`m-1 p-2 ${this.state.itemOnMap ? 'esri-icon-minus' : 'esri-icon-plus'}`}
                            onClick={this.state.itemOnMap ? this.removeLayer : this.addLayer}
                        />
                    </Tooltip>
                    <Tooltip title={this.state.favorite ? 'Remove from favorites' : 'Add to favorites'} placement='bottom'>
                        <Button
                            size='sm'
                            className='m-1 p-2'
                            onClick={() => this.favItem()}
                        >
                            <StarIcon
                                color={this.state.favorite ? '#fad717' : 'transparent'}
                                stroke={this.state.favorite ? '#fad717' : 'black'}
                                width='16'
                                height='16'
                            />
                        </Button>
                    </Tooltip>
                </CardBody>
                <Modal isOpen={this.state.modal} toggle={this.toggleModal} scrollable={true} css='width: 800px;'>

                    {/* Item Title */}
                    <ModalHeader toggle={this.toggleModal}>{item.title}</ModalHeader>
                    <ModalBody css='height: 400px;' className='overflow-auto'>
                        <Row>
                            {item.thumbnailUrl
                                ? <Col className='col-4'>
                                    {/* Item Thumbnail */}
                                    <Image
                                        css='max-width: 150px;'
                                        src={item.thumbnailUrl}
                                        alt={item.snippet}
                                    />
                                </Col>
                                : null
                            }
                            <Col className='col-8'>

                                {/* Item Created Date */}
                                <Row className='mb-2'>
                                    <Col css='font-weight: 500;' className='col-12'>Item Created Date</Col>
                                    <Col className='col-12'>{item.created.toLocaleDateString('en-US', dateFormat)}</Col>
                                </Row>

                                {/* Item Modified Date */}
                                <Row className='mb-2'>
                                    <Col css='font-weight: 500;' className='col-12'>Item Modified Date</Col>
                                    <Col className='col-12'>{item.modified.toLocaleDateString('en-US', dateFormat)}</Col>
                                </Row>
                            </Col>
                        </Row>
                        <Row>
                            <Col className='mt-2 col-12'>

                                {/* Item Description */}
                                <div css={descriptionCSS} id={`${item.id}-description`}>
                                    {item.description ? parse(description) : 'No item description.'}
                                </div>
                                {this.state.clampEnabled ?
                                    <div onClick={() => this.setState({ clamped: !clamped })}>
                                        <span>{clampText} </span>
                                        <span className={clampIcon}></span>
                                    </div>
                                    : null
                                }
                                {/* item tags */}
                                {item.tags && item.tags.length > 0 ? <div css='font-weight: 500;' className='mt-2'>Item Tags</div> : null}
                                {item.tags && item.tags.length > 0 ? item.tags.map((tag, i) => (
                                    <span>
                                        <a
                                            href={`${item.portal.url}/home/content.html?tags=${tag}#organization`}
                                            target='_blank'
                                            title={`More items with this tag: ${tag}`}
                                        >
                                            {tag}
                                        </a>
                                        {i < item.tags.length - 1 ? ', ' : null}
                                    </span>
                                )) : null}

                                {/* item layers */}
                                {this.state.itemLayers && this.state.itemLayers.length > 0 ?
                                    <div css='font-weight: 500;' className='mt-2'>Item Layers</div>
                                    : null
                                }
                                {this.state.itemLayers && this.state.itemLayers.length > 0 ?
                                    this.state.itemLayers.map((layer, i) => (
                                        <span>
                                            <a
                                                href={`${item.url}/${layer.id}`}
                                                target='_blank'
                                                title={`Details about this layer: ${layer.name}`}
                                            >
                                                {layer.name}
                                            </a>
                                            {i < this.state.itemLayers.length - 1 ? ', ' : null}
                                        </span>
                                    )) : null
                                }

                                {/* item tables */}
                                {this.state.itemTables && this.state.itemTables.length > 0 ?
                                    <div css='font-weight: 500;' className='mt-2'>Item Tables</div>
                                    : null
                                }
                                {this.state.itemTables && this.state.itemTables.length > 0 ?
                                    this.state.itemTables.map((table, i) => (
                                        <span>
                                            <a
                                                href={`${item.url}/${table.id}`}
                                                target='_blank'
                                                title={`Details about this table: ${table.name}`}
                                            >
                                                {table.name}
                                            </a>
                                            {i < this.state.itemTables.length - 1 ? ', ' : null}
                                        </span>
                                    )) : null
                                }

                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter className='justify-content-between' css='border-top: 1px solid rgb(213, 213, 213) !important;'>

                        {/* Full Item Details */}
                        <Button tag='a' href={`${item.portal.url}/home/item.html?id=${item.id}`} target='_blank'>
                            Full item details
                        </Button>
                        <Button onClick={this.toggleModal}>Close</Button>
                    </ModalFooter>
                </Modal>
            </Card>
        )
    }
}