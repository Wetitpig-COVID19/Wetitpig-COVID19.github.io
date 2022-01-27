# COVID-19 Dashboard

[![Build from Source](https://github.com/Wetitpig-COVID19/Wetitpig-COVID19.github.io/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/Wetitpig-COVID19/Wetitpig-COVID19.github.io/actions/workflows/build.yml)

This repository may not be actively maintained as the owner is now busy.

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

## Dependencies

### Runtime Dependencies
* [LeafletJS](https://leafletjs.com/)
* [Fuse.js](https://fusejs.io/)
* [Google Charts](https://developers.google.com/chart)
* The user interface is designed with [Material Design for Web](https://material.io/)

### Build Dependencies
See [`package.json`](package.json) for details.

## Data Sources

Data is updated every 30 minutes, at `:15` and `:45` at each hour, from the official repositories below with scripts from the [`data-pull/`](data-pull) directory.

### Cases and Deaths
| Country                       | Data Source                                                                                                                                                                                                                                                                                                                             | License                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Germany                       | [RKI COVID19](https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0/explore)                                                                                                                                                                                                                         | [DL-DE/BY-2-0](https://www.govdata.de/dl-de/by-2-0)                                                     |
| France                        | [Données relatives aux résultats des tests virologiques COVID-19](https://www.data.gouv.fr/fr/datasets/donnees-relatives-aux-resultats-des-tests-virologiques-covid-19/) <br> [Données hospitalières relatives à l'épidémie de COVID-19](https://www.data.gouv.fr/fr/datasets/donnees-hospitalieres-relatives-a-lepidemie-de-covid-19/) | [LO-2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md#licence-ouverte-20open-licence-20) |
| Italy                         | [Dati COVID-19 Italia](https://github.com/pcm-dpc/COVID-19)                                                                                                                                                                                                                                                                             | [CC-BY-4.0](https://github.com/pcm-dpc/COVID-19/blob/master/LICENSE)                                    |
| Austria                       | [Katalog COVID-19: Zeitliche Darstellung von Daten zu Covid19-Fällen je Bezirk](https://www.data.gv.at/katalog/dataset/4b71eb3d-7d55-4967-b80d-91a3f220b60c)                                                                                                                                                                            | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/deed.de)                                        |
| Switzerland and Liechtenstein | [COVID-19 Schweiz](https://opendata.swiss/de/dataset/covid-19-schweiz)                                                                                                                                                                                                                                                                  | [CC-BY](https://opendata.swiss/de/terms-of-use#terms_by)                                                |
| Luxembourg                    | [Données COVID19](https://data.public.lu/fr/datasets/donnees-covid19/)                                                                                                                                                                                                                                                                  | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.fr)                                    |

### Vaccinations
| Country                       | Data Source                                                                                                                                                                                                                                                                                       | License                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Germany                       | [COVID-19-Impfungen in Deutschland](https://github.com/robert-koch-institut/COVID-19-Impfungen_in_Deutschland)                                                                                                                                                                                    | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/deed.de)                                        |
| France                        | [Données relatives aux personnes vaccinées contre la Covid-19](https://www.data.gouv.fr/fr/datasets/donnees-relatives-aux-personnes-vaccinees-contre-la-covid-19-1/)                                                                                                                              | [LO-2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md#licence-ouverte-20open-licence-20) |
| Italy                         | [Covid-19 Opendata Vaccini](https://github.com/italia/covid19-opendata-vaccini)                                                                                                                                                                                                                   | [CC-BY-4.0](https://github.com/pcm-dpc/COVID-19/blob/master/LICENSE)                                    |
| Austria                       | [Katalog COVID-19: Zeitreihe der verabreichten Impfdosen der Corona-Schutzimpfung](https://www.data.gv.at/katalog/dataset/276ffd1e-efdd-42e2-b6c9-04fb5fa2b7ea) <br> [Katalog COVID-19: Impfdaten auf Gemeindeebene](https://www.data.gv.at/katalog/dataset/d230c9e8-745a-4da3-a3b4-86842591d9f0) | [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/deed.de)                                        |
| Switzerland and Liechtenstein | [COVID-19 Schweiz](https://opendata.swiss/de/dataset/covid-19-schweiz)                                                                                                                                                                                                                            | [CC-BY](https://opendata.swiss/de/terms-of-use#terms_by)                                                |
| Luxembourg                    | [Données COVID19](https://data.public.lu/fr/datasets/donnees-covid19/)                                                                                                                                                                                                                            | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.fr)                                    |

## Known Issues
* Slow loading times due to bulk import of map
  * May be alleviated by browser cache
  * Only first load is affected
* Content not displayed on Safari (although buttons are working)
