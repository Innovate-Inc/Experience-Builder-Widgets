// To do:
// living atlas section
// add top border to modal footer

/** @jsx jsx */
import { React, css, AllWidgetProps, jsx, appActions, getAppStore, SessionManager } from "jimu-core";
import {
    Col, Row,
    Button, ButtonGroup, InputGroup, InputGroupAddon, Select, Option, TextInput,
    Dropdown, DropdownButton, DropdownMenu, DropdownItem,
    Navbar, Nav, NavItem, Tooltip
} from "jimu-ui";
import { JimuMapViewComponent, JimuMapView } from "jimu-arcgis";
import * as Portal from "esri/portal/Portal";
import * as OAuthInfo from "esri/identity/OAuthInfo";
import * as esriId from "esri/identity/IdentityManager";
import * as PortalQueryParams from "esri/portal/PortalQueryParams";
import ItemCard from './item-card';
import { ViewGridIcon } from '@icons/material'

export default class Widget extends React.PureComponent<AllWidgetProps<any>, any> {

    constructor(props) {
        super(props)
        this.state = {
            jimuMapView: null,
            portal: null,
            agol: null,
            scope: 'NBAM Content',
            stateGroups: null,
            natlGroups: null,
            selGroup: null,
            folders: null,
            selFolder: null,
            search: '',
            results: [],
            total: 0,
            page: 1,
            sort: 'num-views',
            order: 'desc',
            num: 20,
            gridView: true,
            favorites: null
        };
    };

    activeViewChangeHandler = (jmv: JimuMapView) => {
        if (jmv) {
            this.setState({
                jimuMapView: jmv
            });
        }
    };

    updateResults() {
        let portal;

        // PortalQueryParams object to contain the params set by each user input
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-portal-PortalQueryParams.html
        const params = new PortalQueryParams({
            num: this.state.num,
            sortField: this.state.sort,
            sortOrder: this.state.order,
            start: (this.state.page - 1) * this.state.num
        });

        if (this.state.scope === 'ArcGIS Online') {
            portal = this.state.agol;
        } else {
            portal = this.state.portal;
        }

        // The variable q will contain a string representing a query parameter
        // https://developers.arcgis.com/rest/users-groups-and-items/search-reference.htm
        let q = '';

        const validTypes = [
            'Feature Service',
            'Map Service',
            'Image Service',
            'Vector Tile Service',
            'WMTS',
            'WMS',
            'Feature Collection',
            'Scene Service',
            'KML',
            'WFS',
            'OGCFeatureServer'
        ]

        q = `type:("${validTypes.join('" OR "')}")`

        if (this.state.search != '') {
            q = q.concat(` AND ${this.state.search}`)
        }

        // console.log(portal.user)

        if (this.state.scope === 'NBAM Content' && this.state.selGroup) {
            q = q.concat(` AND group:${this.state.selGroup}`)
        } else if (this.state.scope === 'My Content') {
            q = q.concat(` AND owner:${portal.user.username}`)
        } else if (this.state.scope === 'My Favorites') {
            q = q.concat(` AND group:${portal.user.favGroupId}`)
        }

        q = q.concat(' NOT tags:FBAX')

        params.query = q;

        const _this = this;

        // Query the items in the selected portal, applying the params, to populate the item results
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-portal-Portal.html#queryItems
        portal.queryItems(params).then(function (response) {
            let results = response.results;
            if (_this.state.scope === 'My Content' && _this.state.selFolder) {
                results = results.filter(result => result.ownerFolder === _this.state.selFolder)
            }

            // Update the state property after results are received
            _this.state.portal.user.queryFavorites().then(favorites => {
                _this.setState({
                    results: results,
                    total: response.total,
                    favorites: favorites.results.map(d => d.id)
                });
            });
        });

    };

    componentDidMount() {
        const portalUrl = this.props.portalUrl;

        const info = new OAuthInfo({
            appId: "RUI0HCJEfC2dEZXM",
            portalUrl: portalUrl,
            popup: false
        });

        esriId.registerOAuthInfos([info]);

        esriId
            .checkSignInStatus(info.portalUrl + "/sharing")
            .then(() => { })
            .catch();

        esriId.getCredential(info.portalUrl + "/sharing");

        const portal = new Portal();

        portal.url = portalUrl;
        // Setting authMode to immediate signs the user in once loaded
        portal.authMode = "immediate";
        // Once loaded, user is signed in
        portal.load().then(() => {
            this.setState({
                portal: portal
            });

            // Fetch groups that the user can access to populate the group dropdown menu
            // https://developers.arcgis.com/javascript/latest/api-reference/esri-portal-PortalUser.html#fetchGroups
            portal.user.fetchGroups().then(results => {
                // Set the state properties for each group type by filtering the user group results
                this.setState({
                    stateGroups: results.filter(result => result.tags.includes('State Browse'))
                }, () => {
                    this.setState({
                        natlGroups: results.filter(result => result.tags.includes('Nationwide Browse'))
                    }, () => {
                        this.updateResults()
                    })
                })
            });

            portal.user.fetchFolders().then(results => {
                if (results.length > 0) {
                    this.setState({ folders: results })
                }
            })
        });

        const agol = new Portal();
        agol.url = 'https://www.arcgis.com/'
        // Once loaded, user is signed in
        agol.load().then(() => {
            this.setState({
                agol: agol
            });
        });
    }

    closeSidebar(evt) {
        const sidebarId = evt.target.value;
        getAppStore().dispatch(appActions.widgetStatePropChange(sidebarId, 'collapse', 0))
    }

    render() {

        // SessionManager.getInstance().getSessionByUrl()

        // console.log(this.state.favorites)
        const scopes = ['NBAM Content', 'My Content', 'My Favorites', 'ArcGIS Online', 'Living Atlas'];
        const sortOptions = {
            'title': 'Title',
            'created': 'Created',
            'modified': 'Modified',
            'owner': 'Owner',
            'avg-rating': 'Avg rating',
            'num-ratings': 'Ratings',
            'num-views': 'Views'
        }
        const defaultOrder = {
            'title': 'asc',
            'created': 'desc',
            'modified': 'desc',
            'owner': 'asc',
            'avg-rating': 'desc',
            'num-ratings': 'desc',
            'num-views': 'desc'
        }
        const lastPage = Math.ceil(this.state.total / this.state.num);
        const pages = [];
        for (let i = 1; i <= lastPage; i++) {
            pages.push(i)
        }
        const numOptions = [10, 20, 50, 100]

        // Each select, input, and button has a trigger when changed or interacted with
        // The state property associated with that user input will be updated based on the event trigger
        // Once updated with the asynchronous method this.setState(), a callback parameter will trigger
        // The callback will submit a new query based on the updated state and rerender the item cards
        return (
            <div className='jimu-widget add-data' css='display: flex; flex-direction: column; overflow: hidden'>
                {/* WIDGET HEADER */}
                {/* Includes title, close button, scope selection, group dropdown, folder dropdown, and searchbar. */}
                <Navbar borderBottom={true} className='w-100'>
                    <Nav className='w-100 justify-content-between'>
                        <NavItem css="font-weight: 500; font-size: 1.15rem;">
                            Add Data
                        </NavItem>
                        <NavItem>
                            <Button
                                css='line-height:0px'
                                size='sm'
                                className='p-1 esri-icon-close'
                                onClick={this.closeSidebar}
                                value={this.props.config.sidebarId}
                            />
                        </NavItem>
                    </Nav>
                </Navbar>
                <Navbar borderBottom={true}>
                    <Nav>
                        <NavItem>
                            <Select
                                defaultValue={this.state.scope}
                                onChange={evt => {
                                    this.setState({
                                        scope: evt.target.value,
                                        page: 1
                                    },
                                        () => { this.updateResults() }
                                    )
                                }}
                            >
                                {scopes.map(scope => (
                                    <Option value={scope}>{scope}</Option>
                                ))}
                            </Select>
                        </NavItem>
                    </Nav>
                </Navbar>
                <Navbar
                    borderBottom={true}>
                    <Nav>
                        {this.state.scope === 'NBAM Content' ? (
                            <NavItem>
                                <Select
                                    defaultValue={null}
                                    placeholder='Select a Group'
                                    onChange={evt => {
                                        this.setState({
                                            selGroup: evt.target.value,
                                            page: 1
                                        }, () => {
                                            this.updateResults()
                                        })
                                    }}
                                    style={{ width: 150 }}
                                >
                                    <Option value={null}>All</Option>
                                    <Option divider />
                                    <Option header>
                                        National Groups
                                    </Option>
                                    <Option divider />
                                    {this.state.natlGroups ? this.state.natlGroups.map(group => (
                                        <Option value={group.id}>{group.title}</Option>
                                    )) : null}
                                    <Option divider />
                                    <Option header>
                                        State Groups
                                    </Option>
                                    <Option divider />
                                    {this.state.stateGroups ? this.state.stateGroups.map(group => (
                                        <Option value={group.id}>{group.title}</Option>
                                    )) : null}
                                </Select>
                            </NavItem>
                        ) : null}
                        {this.state.scope === 'My Content' && this.state.folders.length > 0 ? (
                            <NavItem>
                                <Select
                                    defaultValue={null}
                                    placeholder='Folders'
                                    onChange={evt => {
                                        this.setState({
                                            selFolder: evt.target.value,
                                            page: 1
                                        }, () => {
                                            this.updateResults()
                                        })
                                    }}
                                    style={{ width: 150 }}
                                >
                                    <Option value={null}>All My Content</Option>
                                    {this.state.folders ? this.state.folders.map(folder => (
                                        <Option value={folder.id}>{folder.title}</Option>
                                    )) : null}
                                </Select>
                            </NavItem>
                        ) : null}
                        <NavItem>
                            <InputGroup>
                                <TextInput
                                    placeholder="Search"
                                    style={{ width: 150 }}
                                    type='search'
                                    css='
                                            border-top-right-radius:0px;
                                            border-bottom-right-radius:0px;
                                        '
                                    onAcceptValue={evt => {
                                        this.setState({
                                            search: evt,
                                            page: 1
                                        }, () => {
                                            this.updateResults()
                                        })
                                    }}
                                />
                                <InputGroupAddon addonType='append'>
                                    <Button
                                        className='esri-icon-search px-2'
                                        css='
                                            margin-left: -1px;
                                            border-top-left-radius:0px;
                                            border-bottom-left-radius:0px;
                                        '
                                    />
                                </InputGroupAddon>
                            </InputGroup>
                        </NavItem>
                    </Nav>
                </Navbar>
                <Col className="p-2 border-bottom" css="overflow-y: auto; overflow-x: hidden;">
                    {this.props.hasOwnProperty("useMapWidgetIds") && this.props.useMapWidgetIds && this.props.useMapWidgetIds[0] && (
                        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.activeViewChangeHandler} />
                    )}
                    <Row className="m-0" css="overflow-x: hidden;">
                        {this.state.results.map(result => (
                            <Col className={`${this.state.gridView ? 'col-sm-6' : 'col-sm-12'} p-2`}>
                                {this.props.hasOwnProperty("useMapWidgetIds") && this.props.useMapWidgetIds && this.props.useMapWidgetIds[0] && (
                                    <ItemCard
                                        item={result}
                                        jimuMapView={this.state.jimuMapView}
                                        portalUrl={this.state.portal.url}
                                        gridView={this.state.gridView}
                                        favorite={this.state.favorites.includes(result.id)}
                                    />
                                )}
                            </Col>
                        ))}
                    </Row>
                </Col>
                <Navbar className='justify-content-between'>
                    <Dropdown activeIcon={true} direction='up'>
                        <ButtonGroup size="sm">
                            <Button
                                className='p-2 esri-icon-beginning'
                                onClick={() => this.setState({ page: 1 },
                                    () => { this.updateResults() }
                                )}
                                disabled={this.state.page === 1}
                            />
                            <Button
                                className='p-2 esri-icon-left-triangle-arrow'
                                onClick={() => this.setState({ page: this.state.page - 1 },
                                    () => { this.updateResults() }
                                )}
                                disabled={this.state.page === 1}
                            />
                            <DropdownButton className='p-2' arrow={false}>
                                Page {this.state.page}
                            </DropdownButton>
                            <Button
                                className='p-2 esri-icon-right-triangle-arrow'
                                onClick={() => this.setState({ page: this.state.page + 1 },
                                    () => { this.updateResults() }
                                )}
                                disabled={this.state.page >= lastPage}
                            />
                            <Button
                                className='p-2 esri-icon-end'
                                onClick={() => this.setState({ page: lastPage },
                                    () => { this.updateResults() }
                                )}
                                disabled={this.state.page >= lastPage}
                            />
                        </ButtonGroup>
                        <DropdownMenu maxHeight={100}>

                            {pages.map(page =>
                                <DropdownItem
                                    active={this.state.page === page}
                                    onClick={() => {
                                        this.setState({
                                            page: page
                                        }, () => {
                                            this.updateResults()
                                        })
                                    }}
                                >{page}</DropdownItem>
                            )}
                        </DropdownMenu>
                    </Dropdown>
                    <Nav>
                        <NavItem className='px-2 py-1' css='font-size: 0.75rem;'>
                            {this.state.total} {this.state.total === 1 ? 'result' : 'results'}
                        </NavItem>
                    </Nav>
                </Navbar>
                <Navbar css='font-size: 0.75rem;'>
                    <Nav className='justify-content-between'>
                        <NavItem>
                            <Dropdown activeIcon={true}>
                                <DropdownButton className='p-1' arrow={false}>
                                    Page size: {this.state.num}
                                </DropdownButton>
                                <DropdownMenu>
                                    {numOptions.map(num =>
                                        <DropdownItem
                                            active={this.state.num === num}
                                            onClick={() => {
                                                this.setState({
                                                    num: num,
                                                    page: 1
                                                }, () => {
                                                    this.updateResults()
                                                })
                                            }}
                                        >{num}</DropdownItem>
                                    )}
                                </DropdownMenu>
                            </Dropdown>
                        </NavItem>
                        <NavItem>
                            <Dropdown activeIcon={true}>
                                <ButtonGroup>
                                    <DropdownButton arrow={false}>
                                        Sort by: {sortOptions[this.state.sort]}
                                    </DropdownButton>
                                    <Tooltip title={this.state.order === 'desc' ? 'Descending Order' : 'Ascending Order'} placement='bottom'>
                                        <Button
                                            className={`${this.state.order === 'desc' ? 'esri-icon-arrow-down' : 'esri-icon-arrow-up'} px-2`}
                                            onClick={() => {
                                                this.setState({
                                                    order: this.state.order === 'desc' ? 'asc' : 'desc',
                                                    page: 1
                                                }, () => {
                                                    this.updateResults()
                                                })
                                            }}
                                        />
                                    </Tooltip>
                                </ButtonGroup>
                                <DropdownMenu>
                                    {Object.keys(sortOptions).map(key =>
                                        <DropdownItem
                                            active={this.state.sort === key}
                                            onClick={() => {
                                                this.setState({
                                                    sort: key,
                                                    order: defaultOrder[key],
                                                    page: 1
                                                }, () => {
                                                    this.updateResults()
                                                })
                                            }}
                                        >{sortOptions[key]}</DropdownItem>
                                    )}
                                </DropdownMenu>
                            </Dropdown>
                        </NavItem>
                        <NavItem>
                            <Button
                                className="p-1"
                                onClick={() => this.setState({ gridView: !this.state.gridView })}
                            >
                                {this.state.gridView ?
                                    <span className='esri-icon-layer-list sm-size mx-1' />
                                    :
                                    <ViewGridIcon
                                        className='mr-1'
                                        css='vertical-align: text-bottom;'
                                        // color= 'transparent'
                                        // stroke= 'black'
                                        width='18'
                                        height='18'
                                    />
                                }

                                {this.state.gridView ? 'List view' : 'Grid view'}
                            </Button>
                        </NavItem>
                    </Nav>
                </Navbar>
            </div >
        );
    }
}