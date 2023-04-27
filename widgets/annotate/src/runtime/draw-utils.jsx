import Graphic from "esri/Graphic"
import TextSymbol from "esri/symbols/TextSymbol"
import SimpleLineSymbol from "esri/symbols/SimpleLineSymbol"
import SimpleFillSymbol from "esri/symbols/SimpleFillSymbol"

function convertGeometry(measure, view) {
    return measure / view.resolution
}

function getTextWidth(text, context) {
    const measurement = context.measureText(text)
    return measurement.width
}

function formatTextWithLineBreaks(text, width, font, canvas) {
    const maxWidth = Math.min(width, 512)
    const context = canvas.getContext("2d")
    context.font = `${font.size}pt ${font.family}`
    const fullTextWidth = getTextWidth(text, context)
    if (fullTextWidth < maxWidth) {
        return text
    }
    const sep = " "
    const sepWidth = getTextWidth(sep, context)
    const words = text.split(sep)
    const lines = []
    let lineWidth = 0
    let newLine = ""
    words.forEach(word => {
        let wordWidth = getTextWidth(word, context)
        if (lineWidth + wordWidth + sepWidth < maxWidth) {
            newLine = newLine.concat(word, sep)
            lineWidth += wordWidth + sepWidth
        } else {
            lines.push(newLine)
            lineWidth = wordWidth
            newLine = `${word}${sep}`
        }
    })
    lines.push(newLine)
    return lines.join("\n")
}

export function createTextSymbol(geometry, props, inputText, view, canvas) {
    const padding = props.padding
    const width = convertGeometry(geometry.extent.width, view) - padding * 2
    const height = convertGeometry(geometry.extent.height, view) - padding * 2
    const text = formatTextWithLineBreaks(inputText, width, props.font, canvas)
    let xoffset, yoffset
    switch (props.horizontalAlignment) {
        case "center":
            xoffset = 0
            break
        case "left":
            xoffset = -width / 2
            break
        case "right":
            xoffset = width / 2
            break
    }
    switch (props.verticalAlignment) {
        case "middle":
            yoffset = 0
            break
        case "top":
            yoffset = height / 2
            break
        case "bottom":
            yoffset = -height / 2
            break
    }
    const symbol = new TextSymbol({
        color: props.textColor,
        text: text,
        font: props.font,
        horizontalAlignment: props.horizontalAlignment,
        verticalAlignment: props.verticalAlignment,
        xoffset: `${xoffset}px`,
        yoffset: `${yoffset}px`
    })
    return symbol
}

function createTextGraphic(geometry, props, view, canvas) {
    const symbol = createTextSymbol(geometry, props, props.placeholder, view, canvas)
    const textGraphic = new Graphic({
        geometry: geometry,
        symbol: symbol
    })
    return textGraphic
}

export function onCreateGraphic(event, props, id, type, view, canvas) {
    const shapeGraphic = event.graphic
    if (shapeGraphic) {
        if (type === "polyline") {
            shapeGraphic.symbol.color = props.borderColor
            shapeGraphic.symbol.width = props.borderWidth
        } else {
            shapeGraphic.symbol.outline.color = props.borderColor
            shapeGraphic.symbol.outline.width = props.borderWidth
            shapeGraphic.symbol.color = props.fillColor
        }
    }
    const graphic = {
        shapeGraphic: shapeGraphic,
        label: `Graphic ${id}`,
        props: { ...props },
        id: id,
        type: type
    }
    if (event.state === "complete" && type === "text") {
        const textGraphic = createTextGraphic(shapeGraphic.geometry, props, view, canvas)
        graphic.textGraphic = textGraphic
        graphic.textContent = props.placeholder
    }
    return graphic
}

export function onUpdateGraphic(graphic, view, canvas) {
    if (graphic.type === "text") {
        const geometry = graphic.shapeGraphic.geometry
        const textGraphic = graphic.textGraphic
        textGraphic.geometry = geometry
        textGraphic.symbol = createTextSymbol(geometry, graphic.props, graphic.textContent, view, canvas)
    }
}

export function updateSymbolStyle(graphic, propName, propValue, view, canvas) {
    const textFields = ["textColor", "padding", "font", "horizontalAlignment", "verticalAlignment"]
    const polylineFields = ["borderColor", "borderWidth"]
    graphic.props[propName] = propValue
    if (graphic.type === "text" && textFields.includes(propName)) {
        graphic.textGraphic.symbol = createTextSymbol(graphic.textGraphic.geometry, graphic.props, graphic.textContent, view, canvas)
    } else if (graphic.type === "polyline" && polylineFields.includes(propName)) {
        graphic.shapeGraphic.symbol = new SimpleLineSymbol({
            color: graphic.props.borderColor,
            width: graphic.props.borderWidth
        })
    } else {
        graphic.shapeGraphic.symbol = new SimpleFillSymbol({
            color: graphic.props.fillColor,
            outline: {
                color: graphic.props.borderColor,
                width: graphic.props.borderWidth
            }
        })
    }
}