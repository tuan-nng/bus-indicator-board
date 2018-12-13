<template>
    <div id="app">
        <div id="table">
            <button @click="getBusTime">Bus Time</button>
            <template v-for="(items, key) in items_list">
                <div>Platform {{key}}</div>
                <b-table striped hover :items="items"></b-table>
            </template>
        </div>
        <div id="map">
            <div>
                <div>
                    <h2>Search and add a pin</h2>
                    <label>
                        <gmap-autocomplete
                                @place_changed="setPlace">
                        </gmap-autocomplete>
                        <button @click="updateMarker">Go</button>
                    </label>
                    <br/>

                </div>
                <br>
                <gmap-map
                        :center="center"
                        :zoom="12"
                        style="width:100%;  height:800px;"
                >
                    <gmap-marker
                            :key="index"
                            v-for="(m, index) in markers"
                            :position="m.position"
                            @click="center=m.position"
                    ></gmap-marker>
                </gmap-map>
            </div>
        </div>
    </div>
</template>

<script>
    import axios from 'axios'

    export default {
        name: 'app',
        // components: {
        //     GoogleMap
        // },
        data() {
            return {
                items_list: [],

                // default to Montreal to keep it simple
                // change this to whatever makes sense
                center: {lat: 45.508, lng: -73.587},
                markers: [],
                places: [],
                currentPlace: null,
                currentPosition: null
            }
        },
        mounted() {
            this.geolocate();
        },
        methods: {
            async getBusTime() {
                if (this.currentPosition) {
                    const res = await axios.post('https://api.entur.org/journeyplanner/2.0/index/graphql', {
                        query: `
                        {
                          nearest(latitude: ${this.currentPosition.lat},
                            longitude: ${this.currentPosition.lng},
                            maximumDistance: 1000,
                            filterByPlaceTypes: [stopPlace],
                            first: 1
                          )

                          {
                            edges {
                              node {
                                place {
                                  id
                                  longitude
                                  latitude
                                },
                                distance
                              }
                            }
                          }
                        }`,
                    });
                    const nearestStop = res.data.data.nearest.edges[0];
                    this.markers = [{
                        position: {
                            lat: nearestStop.node.place.latitude,
                            lng: nearestStop.node.place.longitude
                        }
                    }];
                    const busRes = await axios.post('https://api.entur.org/journeyplanner/2.0/index/graphql', {
                        query: `
                        {
                          stopPlace(id: "${nearestStop.node.place.id}") {
                            id
                            name
                            estimatedCalls(numberOfDepartures: 5) {
                              realtime
                              expectedArrivalTime
                              forBoarding
                              forAlighting
                              destinationDisplay {
                                frontText
                              }
                              quay {
                                id
                                publicCode
                              }
                              serviceJourney {
                                journeyPattern {
                                  line {
                                    publicCode
                                    name
                                    transportMode
                                  }
                                }
                              }
                            }
                          }
                        }`,
                    });

                    const estimatedCalls = busRes.data.data.stopPlace.estimatedCalls;
                    const items = {};
                    estimatedCalls.forEach(function (item) {
                        let quayId = item.quay.publicCode;
                        if (!quayId) {
                            quayId = item.quay.id;
                        }
                        if (quayId in items) {
                            items[quayId].push({
                                placeId: nearestStop.node.place.id,
                                bus: item.serviceJourney.journeyPattern.line.publicCode,
                                arrivalTime: (new Date(item.expectedArrivalTime)).toLocaleString()
                            })
                        } else {
                            items[quayId] = [{
                                placeId: nearestStop.node.place.id,
                                bus: item.serviceJourney.journeyPattern.line.publicCode,
                                arrivalTime: (new Date(item.expectedArrivalTime)).toLocaleString()
                            }];
                        }
                    });

                    const keys = Object.keys(items);
                    keys.sort();
                    const items_list = {};
                    let count = 0;
                    keys.forEach(function (key) {
                        const item = items[key];

                        if (key.includes(":")) {
                            key = ++count;
                        }
                        items_list[key] = item;
                    });
                    this.items_list = items_list;
                }
            },
            // receives a place object via the autocomplete component
            setPlace(place) {
                this.currentPlace = place;
            },
            updateMarker() {
                if (this.currentPlace) {
                    const marker = {
                        lat: this.currentPlace.geometry.location.lat(),
                        lng: this.currentPlace.geometry.location.lng()
                    };
                    this.markers = [{position: marker}];
                    this.places.push(this.currentPlace);
                    this.center = marker;
                    this.currentPosition = marker;
                }
            },
            geolocate: function () {
                navigator.geolocation.getCurrentPosition(position => {
                    this.center = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.markers.push({position: this.center});
                    this.currentPosition = this.center;
                });
            }
        }
    }
</script>

<style>
    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        margin-top: 60px;
    }

    #table {
        position: absolute;
        left: 0;
        width: 50%
    }

    #map {
        position: absolute;
        right: 0;
        width: 50%
    }
</style>