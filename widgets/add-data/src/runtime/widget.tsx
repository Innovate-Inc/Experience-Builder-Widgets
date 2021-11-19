// To do:
// living atlas section
// add top border to modal footer

/** @jsx jsx */
import { React, css, AllWidgetProps, jsx, appActions, getAppStore, SessionManager } from 'jimu-core';
import {
    Col, Row,
    Button, ButtonGroup, InputGroup, InputGroupAddon, Select, Option, TextInput,
    Dropdown, DropdownButton, DropdownMenu, DropdownItem,
    Navbar, Nav, NavItem, Tooltip
} from 'jimu-ui';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
import * as Portal from 'esri/portal/Portal';
import * as PortalQueryParams from 'esri/portal/PortalQueryParams';
import ItemCard from './item-card';

export default class Widget extends React.PureComponent<AllWidgetProps<any>, any> {

    constructor(props) {
        super(props)
        this.state = {
            jimuMapView: null,
            portal: null,
            agol: null,
            scope: 'My Organization',
            groups: null,
            selGroup: null,
            folders: null,
            selFolder: null,
            search: '',
            results: [],
            total: 0,
            page: 1,
            sort: 'num-views',
            order: 'desc',
            resultsPerPage: 20,
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
        let portal = this.state.portal;

        // PortalQueryParams object to contain the params set by each user input
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-portal-PortalQueryParams.html
        const params = new PortalQueryParams({
            num: this.state.resultsPerPage,
            sortField: this.state.sort,
            sortOrder: this.state.order,
            start: (this.state.page - 1) * this.state.resultsPerPage
        });

        // The variable q will contain a string representing a query parameter
        // https://developers.arcgis.com/rest/users-groups-and-items/search-reference.htm

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

        let q = `type:("${validTypes.join('" OR "')}")`

        if (this.state.search != '') {
            q = q.concat(` AND ${this.state.search}`)
        }

        if (this.state.scope === 'My Groups' && this.state.selGroup) {
            q = q.concat(` AND group:${this.state.selGroup}`)
        } else if (this.state.scope === 'My Content' && portal.user && portal.user.username) {
            q = q.concat(` AND owner:${portal.user.username}`)
        } else if (this.state.scope === 'My Favorites' && portal.user && portal.user.favGroupId) {
            q = q.concat(` AND group:${portal.user.favGroupId}`)
        }

        if (this.state.scope === 'ArcGIS Online') {
            portal = this.state.agol;
        }


        params.query = q;

        const _this = this;

        // Query the items in the selected portal, applying the params, to populate the item results
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-portal-Portal.html#queryItems
        portal.queryItems(params).then(function (response) {
            let results = response.results;
            if (_this.state.scope === 'My Content' && _this.state.selFolder) {
                results = results.filter(result => result.ownerFolder === _this.state.selFolder)
            }

            // query user favorites
            if (_this.state.portal.user) {
                _this.state.portal.user.queryFavorites().then(favorites => {
                    _this.setState({
                        results: results,
                        total: response.total,
                        favorites: favorites.results.map(d => d.id)
                    });
                });
            }
        });

    };

    componentDidMount() {
        const portalUrl = this.props.portalUrl;
        const session = SessionManager.getInstance();
        session.signIn('/', true, portalUrl).then(response => {

            // access agol content
            const agol = new Portal();
            agol.url = 'https://www.arcgis.com/';
            agol.load().then(() => {
                this.setState({
                    agol: agol
                });
            });

            // access portal content
            let portal = new Portal();
            portal.url = portalUrl;
            portal.load().then(() => {
                this.setState({
                    portal: portal
                });
                if (portal.user) {
                    portal.user.fetchGroups().then((groups) => {
                        portal.user.fetchFolders().then(folders => {
                            if (folders.length > 0) {
                                this.setState({
                                    folders: folders,
                                    groups: groups
                                }, () => {
                                    this.updateResults()
                                });
                            };
                        });
                    })
                }
            })
        }).catch()
    };

    render() {
        const config = this.props.config;
        const scopes = config.selectedScopes;
        const sortOptions = config.sortOptions;
        const defaultOrders = config.defaultOrders;
        const lastPage = Math.ceil(this.state.total / this.state.resultsPerPage);
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
                {/* Includes title, scope selection, group dropdown, folder dropdown, and searchbar. */}
                <Navbar borderBottom={true} className='w-100'>
                    <Nav className='w-100 justify-content-between'>
                        <NavItem css='font-weight: 500; font-size: 1.15rem;'>
                            Add Data
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
                        {this.state.scope === 'My Groups' ? (
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
                                    {this.state.groups ? this.state.groups.map(group => (
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
                    </Nav>
                </Navbar>
                <Navbar
                    borderBottom={true}>
                    <Nav>
                        <NavItem>
                            <InputGroup>
                                <TextInput
                                    placeholder='Search'
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
                <Col className='p-2 border-bottom' css='overflow-y: auto; overflow-x: hidden;'>
                    {this.props.hasOwnProperty('useMapWidgetIds') && this.props.useMapWidgetIds && this.props.useMapWidgetIds[0] && (
                        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.activeViewChangeHandler} />
                    )}
                    <Row className='m-0' css='overflow-x: hidden;'>
                        {this.state.results.map(result => (
                            <Col className='col-sm-6 p-2'>
                                {this.props.hasOwnProperty('useMapWidgetIds') && this.props.useMapWidgetIds && this.props.useMapWidgetIds[0] && (
                                    <ItemCard
                                        item={result}
                                        jimuMapView={this.state.jimuMapView}
                                        portalUrl={this.state.portal.url}
                                        favorite={this.state.favorites.includes(result.id)}
                                    />
                                )}
                            </Col>
                        ))}
                    </Row>
                </Col>
                <Navbar className='justify-content-between'>
                    <Dropdown activeIcon={true} direction='up'>
                        <ButtonGroup size='sm'>
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
                                    Page size: {this.state.resultsPerPage}
                                </DropdownButton>
                                <DropdownMenu>
                                    {numOptions.map(num =>
                                        <DropdownItem
                                            active={this.state.resultsPerPage === num}
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
                                                    order: defaultOrders[key],
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
                    </Nav>
                </Navbar>
            </div >
        );
    }
}