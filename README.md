# COVID-19 Dashboard

This repository may not be actively worked upon as the owner is now busy.

## Data offered in Dashboard
* Cases
* Deaths
* Vaccination

## Countries with Data
* Switzerland
* Germany
* France
* Austria
* Italy
* Liechtenstein
* Luxembourg

Data is provided mostly on the [NUTS3](https://en.wikipedia.org/wiki/Nomenclature_of_Territorial_Units_for_Statistics) level, except for cases where official data is not available. All data is pulled from offficial repositories.

The user interface is designed with [Material Design for Web](https://material.io/)

## Data Sources

### Cases and Deaths
| Country 						| Data Source																					|
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Germany 						| [COVID-19 Datenhub](https://npgeo-corona-npgeo-de.hub.arcgis.com/)							|
| France  						| [Les données relatives au COVID-19](https://www.data.gouv.fr/fr/pages/donnees-coronavirus/)	|
| Italy   						| [Dati COVID-19 Italia](https://github.com/pcm-dpc/COVID-19)									|
| Austria 						| [COVID Daten regional mit Zeitreihe](https://innosol.at/covid/district.html)					|
| Switzerland and Liechtenstein	| [COVID-19 Schweiz](https://opendata.swiss/de/dataset/covid-19-schweiz)						|
| Luxembourg					| [Données COVID19](https://data.public.lu/fr/datasets/donnees-covid19/)						|

### Vaccinations
| Country 						| Data Source																																|
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Germany 						| [COVID-19-Impfungen in Deutschland](https://github.com/robert-koch-institut/COVID-19-Impfungen_in_Deutschland)							|
| France  						| [Les données relatives au COVID-19](https://www.data.gouv.fr/fr/pages/donnees-coronavirus/)												|
| Italy   						| [Covid-19 Opendata Vaccini](https://github.com/italia/covid19-opendata-vaccini)															|
| Austria 						| [news @ ORF.at](https://orf.at/corona/daten/impfung/)																						|
| Luxembourg					| [Données COVID19](https://data.public.lu/fr/datasets/donnees-covid19/)																	|

## Known Issues
* Slow loading times due to bulk import of data (may be alleviated by browser cache)
* Content not displayed on Safari (although buttons are working)
