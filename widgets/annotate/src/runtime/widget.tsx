import { React, AllWidgetProps } from "jimu-core";
import { Container, Row, Col, Button, TextInput, TextArea, Card, CardHeader, CardBody, Dropdown, DropdownButton, DropdownMenu, DropdownItem, Label, Switch } from "jimu-ui";
import { ColorPicker } from 'jimu-ui/basic/color-picker'
import { JimuMapViewComponent, JimuMapView } from "jimu-arcgis";
import MapNotesLayer from "esri/layers/MapNotesLayer";
import SketchViewModel from "esri/widgets/Sketch/SketchViewModel";
import { AddDialogOutlined } from 'jimu-icons/outlined/editor/add-dialog'
import { UppercaseOutlined } from 'jimu-icons/outlined/editor/uppercase'
import { WidgetTextOutlined } from 'jimu-icons/outlined/brand/widget-text'
import { PolylineOutlined } from 'jimu-icons/outlined/gis/polyline'
import { PolygonOutlined } from 'jimu-icons/outlined/gis/polygon'
import { RectangleOutlined } from 'jimu-icons/outlined/gis/rectangle'
import { PinEsriOutlined } from 'jimu-icons/outlined/gis/pin-esri'
import { CircleOutlined } from 'jimu-icons/outlined/gis/circle'
import { WidgetPlaceHolderOutlined } from 'jimu-icons/outlined/brand/widget-place-holder'
import { WidgetSectionViewOutlined } from 'jimu-icons/outlined/brand/widget-section-view'
import { TextLeftOutlined } from 'jimu-icons/outlined/editor/text-left'
import { TextCenterOutlined } from 'jimu-icons/outlined/editor/text-center'
import { TextRightOutlined } from 'jimu-icons/outlined/editor/text-right'
import { MinusOutlined } from 'jimu-icons/outlined/editor/minus'
import { SaveOutlined } from 'jimu-icons/outlined/application/save'
import Graphic from "esri/Graphic";
import Color from "esri/Color";
import TextSymbol from "esri/symbols/TextSymbol"
import SimpleFillSymbol from "esri/symbols/SimpleFillSymbol";
import { onCreateGraphic, onUpdateGraphic, updateSymbolStyle, createTextSymbol } from "./draw-utils"
import { TrashOutlined } from "jimu-icons/outlined/editor/trash";
import reactiveUtils from "esri/core/reactiveUtils"

export default class Widget extends React.PureComponent<AllWidgetProps<{}>, any> {

	constructor(props) {
		super(props)
		this.state = {
			sketchViewModels: null,
			selectedGraphic: null,
			allGraphics: [],
			graphicsCount: 0,
			activeTool: null,
			editorProps: {
				placeholder: "Enter text here...",
				fillColor: "#ffffff",
				borderColor: "#000000",
				textColor: "#000000",
				padding: 10,
				font: {
					family: "Arial",
					size: 14
				},
				horizontalAlignment: "left",
				verticalAlignment: "top",
				borderWidth: 1
			},
			canvas: document.createElement("canvas"),
			activeButton: null,
			view: null,
			deletingGraphic: false
		}
	}

	activeViewChangeHandler = (jmv: JimuMapView) => {
		if (jmv) {
			jmv.view.when((view) => {
				const mapNotesLayer = new MapNotesLayer();
				const textLayer = mapNotesLayer.textLayer
				const sketchViewModels = {
					text: this.createSVM(view, textLayer),
					point: this.createSVM(view, mapNotesLayer.pointLayer),
					polyline: this.createSVM(view, mapNotesLayer.polylineLayer),
					polygon: this.createSVM(view, mapNotesLayer.polygonLayer, textLayer),
				}
				view.map.add(mapNotesLayer);
				this.setState({
					sketchViewModels: sketchViewModels,
					view: view
				})
				reactiveUtils.watch(() => view.extent, () => {
					this.state.allGraphics.forEach(graphic => {
						if (graphic.type === "text") {
							const symbol = createTextSymbol(graphic.shapeGraphic.geometry, graphic.props, graphic.textContent, this.state.view, this.state.canvas)
							graphic.textGraphic.symbol = symbol
						}
					})
				});
			})
		}
	}

	updateEditorProps(props) {
		this.setState(prevState => {
			const editorProps = {...prevState.editorProps}
			Object.keys(props).forEach(key => editorProps[key] = props[key])
			return {
				editorProps: editorProps
			}
		})
	}

	createSVM(view, layer, textLayer=null) {
		const sketchViewModel = new SketchViewModel({
			view: view,
			layer: layer,
			updateOnGraphicClick: true
		});
		sketchViewModel.on("update", (event) => {
			Object.keys(this.state.sketchViewModels).forEach(key => {
				if (this.state.sketchViewModels[key] !== sketchViewModel) {
					this.state.sketchViewModels[key].complete()
				}
			})
			if (event.graphics.length > 1) {
				const graphic = event.graphics[1]
				sketchViewModel.complete()
				sketchViewModel.update(graphic)
			}
			if (this.state.deleting) {
				sketchViewModel.delete()
				this.setState({
					deleting: false
				})
			} else if (event.state === "complete") {
				this.setState({
					selectedGraphic: null
				})
			} else {
				const eventGraphic = event.graphics[0]
				if (layer.title === "Text") {
					const graphic = this.state.allGraphics.find(g => {
						if (g.type === "text") {
							return g.textGraphic.uid === eventGraphic["uid"]
						} else {
							return false
						}
					})
					if (graphic.shapeGraphic.layer) {
						sketchViewModel.complete()
						this.state.sketchViewModels.polygon.update(graphic.shapeGraphic)
					} else {
						sketchViewModel.delete()
						this.setState(prevState => {
							const allGraphics = [...prevState.allGraphics]
							const graphicIndex = allGraphics.indexOf(graphic)
							allGraphics.splice(graphicIndex, 1)
							return {
								allGraphics: allGraphics
							}
						})
					}
				} else {
					const graphic = this.state.allGraphics.find(g => {
						return g.shapeGraphic.uid === eventGraphic["uid"]
					})
					this.setState({
						selectedGraphic: graphic
					})
					onUpdateGraphic(graphic, view, this.state.canvas)
					this.setState({editorProps: {...graphic.props}})
				}	
			}
		});
		if (layer.title !== "Text") {
			sketchViewModel.on("create", (event) => {
				if (event.state === "complete") {
					const graphic = onCreateGraphic(event,
						{...this.state.editorProps},
						this.state.graphicsCount + 1,
						this.state.activeTool,
						view,
						this.state.canvas
					)
					if (graphic.textGraphic && textLayer) {
						textLayer.add(graphic.textGraphic)
						graphic.callout = false
					}
					this.setState(prevState => {
						prevState.allGraphics.push(graphic)
						return {
							graphicsCount: prevState.graphicsCount + 1,
							selectedGraphic: graphic,
							allGraphics: prevState.allGraphics,
							activeTool: null
						}
					})
					this.updateGraphic(graphic)
				} else {console.log(this.state.selectedGraphic)}
			});
			sketchViewModel.on("delete", (event) => {
				const eventGraphic = event.graphics[0]
				const graphic = this.state.allGraphics.find(g => g.shapeGraphic.uid === eventGraphic["uid"])
				if (graphic.textGraphic) {
					this.state.sketchViewModels.text.update(graphic.textGraphic)
				} else {
					this.setState(prevState => {
						const allGraphics = [...prevState.allGraphics]
						const graphicIndex = allGraphics.indexOf(graphic)
						allGraphics.splice(graphicIndex, 1)
						return {
							allGraphics: allGraphics
						}
					})
				}
			})
		}
		return sketchViewModel
	}

	deleteSelectedGraphic() {
		const graphic = this.state.selectedGraphic
		let sketchViewModel
		switch (graphic.type) {
			case "polyline":
			case "point":
				sketchViewModel = this.state.sketchViewModels[graphic.type]
				break
			default:
				sketchViewModel = this.state.sketchViewModels.polygon
				break
		}
		this.setState(() => {
			sketchViewModel.update(graphic.shapeGraphic)	
			return {
				deleting: true
			}
		})
	}

	updateGraphic(graphic) {
		let sketchViewModel
		switch (graphic.type) {
			case "polyline":
			case "point":
				sketchViewModel = this.state.sketchViewModels[graphic.type]
				break
			default:
				sketchViewModel = this.state.sketchViewModels.polygon
				break
		}
		sketchViewModel.update(graphic.shapeGraphic)
	}

	onSelectTool(tool) {
		Object.keys(this.state.sketchViewModels).forEach(key => this.state.sketchViewModels[key].complete())
		let sketchViewModel
		switch (tool) {
			case "polyline":
			case "point":
				sketchViewModel = this.state.sketchViewModels[tool]
				break
			default:
				sketchViewModel = this.state.sketchViewModels.polygon
				break
		}
		if (this.state.activeTool === tool) {	
			sketchViewModel.cancel()
			this.setState({activeTool: null})
		} else {
			if (tool === "text") {
				sketchViewModel.create("rectangle")
			} else {
				sketchViewModel.create(tool)
			}
			this.setState({activeTool: tool})
		}
	}

	render() {
		const paddingValues = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
		const borderWidths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		return (
			<Container
				className="jimu-widget custom-draw d-flex flex-column h-100 overflow-hidden py-2 px-4 m-0"
				style={{ "fontSize": "11pt" }}
			>
				<Row className="m-0 py-2 px-0 border-bottom align-items-center">
					<div>Add new feature:</div>
					<Button
						className="m-1"
						aria-label="New text feature"
						title="New text feature"
						icon
						onClick={() => this.onSelectTool("text")}
						active={this.state.activeTool === "text"}
						disabled={!this.state.sketchViewModels}
					>
						<WidgetTextOutlined />
					</Button>
					<Button
						className="m-1"
						aria-label="New point feature"
						title="New point feature"
						icon
						onClick={() => this.onSelectTool("point")}
						active={this.state.activeTool === "point"}
						disabled={!this.state.sketchViewModels}
					>
						<PinEsriOutlined />
					</Button>
					<Button
						className="m-1"
						aria-label="New line feature"
						title="New line feature"
						icon
						onClick={() => this.onSelectTool("polyline")}
						active={this.state.activeTool === "line"}
						disabled={!this.state.sketchViewModels}
					>
						<PolylineOutlined />
					</Button>
					<Button
						className="m-1"
						aria-label="New polygon feature"
						title="New polygon feature"
						icon
						onClick={() => this.onSelectTool("polygon")}
						active={this.state.activeTool === "polygon"}
						disabled={!this.state.sketchViewModels}
					>
						<PolygonOutlined />
					</Button>
					<Button
						className="m-1"
						aria-label="New rectangle feature"
						title="New rectangle feature"
						icon
						onClick={() => this.onSelectTool("rectangle")}
						active={this.state.activeTool === "rectangle"}
						disabled={!this.state.sketchViewModels}
					>
						<RectangleOutlined />
					</Button>
					<Button
						className="m-1"
						aria-label="New circle feature"
						title="New circle feature"
						icon
						onClick={() => this.onSelectTool("circle")}
						active={this.state.activeTool === "circle"}
						disabled={!this.state.sketchViewModels}
					>
						<CircleOutlined />
					</Button>
				</Row>
				<Row className="m-0 py-2 px-0">
					<ColorPicker
						color={this.state.editorProps.fillColor}
						className="m-1"
						aria-label="Fill color"
						title="Fill color"
						onChange={(e) => {
							this.updateEditorProps({fillColor: e})
							if (this.state.selectedGraphic) {
								updateSymbolStyle(this.state.selectedGraphic, "fillColor", e, this.state.view, this.state.canvas)
							}
						}}
					/>
					<ColorPicker
						color={this.state.editorProps.borderColor}
						className="m-1"
						aria-label="Border color"
						title="Border color"
						onChange={(e) => {
							this.updateEditorProps({borderColor: e})
							if (this.state.selectedGraphic) {
								updateSymbolStyle(this.state.selectedGraphic, "borderColor", e, this.state.view, this.state.canvas)
							}
						}}
						outline
					/>
					<ColorPicker
						color={this.state.editorProps.textColor}
						className="m-1"
						type="with-icon"
						icon={<UppercaseOutlined />}
						aria-label="Text color"
						title="Text color"
						disabled={this.state.selectedGraphic && this.state.selectedGraphic.type !== "text"}
						onChange={(e) => {
							this.updateEditorProps({textColor: e})
							if (this.state.selectedGraphic) {
								updateSymbolStyle(this.state.selectedGraphic, "textColor", e, this.state.view, this.state.canvas)
							}
						}}
					/>
					<Dropdown
						activeIcon
						menuItemCheckMode
					>
						<DropdownButton
							aria-label="Text padding"
							title="Text padding"
							type="tertiary"
							icon
							arrow={false}
							size="default"
							disabled={this.state.selectedGraphic && this.state.selectedGraphic.type !== "text"}
						>
							<WidgetPlaceHolderOutlined />
						</DropdownButton>
						<DropdownMenu>
							<DropdownItem header>
								Text padding:
							</DropdownItem>
							<DropdownItem divider />
							{paddingValues.map(p =>
								<DropdownItem
									active={this.state.editorProps.padding === p}
									onClick={() => {
										this.updateEditorProps({padding: p})
										if (this.state.selectedGraphic) {
											updateSymbolStyle(this.state.selectedGraphic, "padding", p, this.state.view, this.state.canvas)
										}
									}}
									value={p}
								>
									{p}
								</DropdownItem>	
							)}
						</DropdownMenu>
					</Dropdown>
					<Dropdown
						activeIcon
						menuItemCheckMode
					>
						<DropdownButton
							aria-label="Border width"
							title="Border width"
							type="tertiary"
							icon
							size="default"
							arrow={false}
						>
							<MinusOutlined />
						</DropdownButton>
						<DropdownMenu>
							<DropdownItem header>
								Border width:
							</DropdownItem>
							<DropdownItem divider />
							{borderWidths.map(w =>
								<DropdownItem
									active={this.state.editorProps.borderWidth === w}
									onClick={() => {
										this.updateEditorProps({borderWidth: w})
										if (this.state.selectedGraphic) {
											updateSymbolStyle(this.state.selectedGraphic, "borderWidth", w, this.state.view, this.state.canvas)
										}
									}}
									value={w}
								>
									{w}
								</DropdownItem>	
							)}
						</DropdownMenu>
					</Dropdown>
					<Dropdown
						activeIcon
						menuItemCheckMode
					>
						<DropdownButton
							aria-label="Text alignment"
							title="Text alignment"
							type="tertiary"
							icon
							size="default"
							disabled={this.state.selectedGraphic && this.state.selectedGraphic.type !== "text"}
							arrow={false}
						>
							{this.state.editorProps.horizontalAlignment === "left" ?
								<TextLeftOutlined />
							: this.state.editorProps.horizontalAlignment === "center" ?
								<TextCenterOutlined />
							:
								<TextRightOutlined />
							}
						</DropdownButton>
						<DropdownMenu>
							<DropdownItem header>
								Text alignment:
							</DropdownItem>
							<DropdownItem divider />
							<DropdownItem
								active={this.state.editorProps.horizontalAlignment === "left"}
								onClick={() => {
									this.updateEditorProps({horizontalAlignment: "left"})
									if (this.state.selectedGraphic) {
										updateSymbolStyle(this.state.selectedGraphic, "horizontalAlignment", "left", this.state.view, this.state.canvas)
									}
								}}
								value="left"
							>
								<TextLeftOutlined className="mr-2" />Left
							</DropdownItem>
							<DropdownItem
								active={this.state.editorProps.horizontalAlignment === "center"}
								onClick={() => {
									this.updateEditorProps({horizontalAlignment: "center"})
									if (this.state.selectedGraphic) {
										updateSymbolStyle(this.state.selectedGraphic, "horizontalAlignment", "center", this.state.view, this.state.canvas)
									}
								}}
								value="center"
							>
								<TextCenterOutlined className="mr-2" />Center
							</DropdownItem>
							<DropdownItem
								active={this.state.editorProps.horizontalAlignment === "right"}
								onClick={() => {
									this.updateEditorProps({horizontalAlignment: "right"})
									if (this.state.selectedGraphic) {
										updateSymbolStyle(this.state.selectedGraphic, "horizontalAlignment", "right", this.state.view, this.state.canvas)
									}
								}}
								value="right"
							>
								<TextRightOutlined className="mr-2" />Right
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
				</Row>
				{this.state.selectedGraphic ?
					<Row className="m-0 py-2 px-0">
						<Col className="m-0 p-0">
							<TextInput
								placeholder="Graphic label"
								defaultValue={this.state.selectedGraphic.label}
								onChange={(e) => {
									const graphic = this.state.selectedGraphic
									graphic.label = e.target.value
								}}
							>
							</TextInput>
							{this.state.selectedGraphic.type === "text" ?
								<TextArea
									className="mt-2"
									placeholder="Type your text here"
									height={100}
									defaultValue={this.state.selectedGraphic.textContent}
									onChange={(e) => {
										const text = e.target.value
										const graphic = this.state.selectedGraphic
										graphic.textContent = text
										const symbol = createTextSymbol(graphic.shapeGraphic.geometry, graphic.props, text, this.state.view, this.state.canvas)
										graphic.textGraphic.symbol = symbol
									}}
								/>
							: null}
							{this.state.selectedGraphic.type === "text" ?
								<Switch
									aria-label="Switch"
									checked={this.state.selectedGraphic.callout}
									onChange={(e) => {
										this.setState(prevState => {
											const selectedGraphic = {...prevState.selectedGraphic}
											selectedGraphic.callout = e.target.checked
											const allGraphics = [...prevState.allGraphics]
											const graphic = allGraphics.find(g => selectedGraphic.id === g.id)
											graphic.callout = e.target.checked
											return {
												selectedGraphic: selectedGraphic,
												allGraphics: this.state.allGraphics
											}
										})
									}}
								/>
							: null}
							<Row className="justify-content-between m-0 p-0">
								<Button
									className="mt-2"
									onClick={() => {
										this.setState({
											selectedGraphic: null,
											activeTool: null
										})
										Object.keys(this.state.sketchViewModels).forEach(key => this.state.sketchViewModels[key].complete())
									}}
								>
									Save
									<SaveOutlined className="ml-2" />
								</Button>
								<Button
									className="mt-2"
									onClick={() => {
										this.deleteSelectedGraphic()
									}}
								>
									Delete Selected
									<TrashOutlined className="ml-2" />
								</Button>
							</Row>
						</Col>
					</Row>
				: null}
				<Row className="m-0 py-2 px-0">
					{this.state.allGraphics.map(g =>
						<Card
							horizontal
							className="p-0 m-1 w-100"
							active={this.state.selectedGraphic && this.state.selectedGraphic.id === g.id}
							button
							onClick={() => {
								this.setState({
									selectedGraphic: g
								})
								this.updateGraphic(g)
							}}
						>
							<CardHeader className="p-2 border-bottom-0 border-right">
								{g.type === "text" ?
									<WidgetTextOutlined />
								: g.type === "point" ?
									<PinEsriOutlined />
								: g.type === "polyline" ?
									<PolylineOutlined />
								: g.type === "polygon" ?
									<PolygonOutlined />
								: g.type === "rectangle" ?
									<RectangleOutlined />
								: g.type === "circle" ?
									<CircleOutlined />
								: null}
							</CardHeader>
							<CardBody className="text-truncate p-2">
								{g.label}
							</CardBody>
						</Card>
					)}
				</Row>
				<JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.activeViewChangeHandler} />
			</Container>
		);
	}

}