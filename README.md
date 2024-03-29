# Experience-Builder-Widgets
These widgets are available for deployment in next generation geospatial web apps, leveraging ArcGIS Experience Builder's powerful and versatile React-based framework to allow end users to perform a variety of mapping and visualization tasks.

---

## Requirements
* Create a client ID for your application and install Node.js and NPM by following the [ArcGIS Experience Builder Install Guide](https://developers.arcgis.com/experience-builder/guide/install-guide/)

---

## Deployment

1. Download [ArcGIS Experience Builder for Developers](https://developers.arcgis.com/downloads/#arcgis-experience-builder)
2. Extract the zip file into your desired location
3. Within the client folder, install all requirements
```sh
cd client
npm install
```
4. Install custom widget dependencies into client directory (client/package.json or npm i):
     ```
   "react-virtual": "^2.10.4" (sharepoint-documents)
   "@azure/msal-browser": "^2.25.0" (sharepoint-documents)
   "html-react-parser": "^1.4.14" (add-data)
   "@microsoft/microsoft-graph-client": "^3.0.2" (sharepoint-documents)
   "react-query": "^3.39.0" (sharepoint-documents)
```
5. Clone the repo into the `client/innovate-widgets` folder
```sh
git clone git@github.com:Innovate-Inc/Experience-Builder-Widgets.git innovate-widgets
```
5. Add the widget(s) to your custom app through the Experience Builder Developer interface

![Add Widget Interface](add-widget-interface.jpg)

---

## Widgets

### Add Data
The Add Data Widget adds functionality for users to search for, add, and remove data sources to maps.

#### Version
1.1

#### Latest Release
8/2/2022

#### Experience Builder Version
1.9
