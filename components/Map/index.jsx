var React = require("react"),
    Fluxxor = require("fluxxor");

require("./style.css");
var L = require("leaflet");
L.Icon.Default.imagePath = 'path-to-your-leaflet-images-folder';
require("leaflet/dist/leaflet.css");

var $ = require("jquery");

// Require React-Router
var Router = require('react-router');
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;
var Navigation = require('react-router/modules/mixins/Navigation');

var FluxMixin = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

var images = {
    0: "marker-mot.svg",
    1: "marker-mot.svg",
    2: "marker-mot.svg",
    3: "marker-mot-crossed.svg",
    4: "marker-mot.svg"
};
var activeImages = {
    0: "marker-mot-active.svg",
    1: "marker-mot-active.svg",
    2: "marker-mot-active.svg",
    3: "marker-mot-crossed-active.svg",
    4: "marker-mot-active.svg"
};

var getIcon = function(status) {
    return L.icon({
        iconUrl: require("./images/" + images[status]),
        iconSize:     [39, 42], // size of the icon
        iconAnchor:   [39, 42] // point of the icon which will correspond to marker's location
    });
};

var getActiveIcon = function(status) {
    return L.icon({
        iconUrl: require("./images/" + activeImages[status]),
        iconSize:     [39, 42], // size of the icon
        iconAnchor:   [39, 42] // point of the icon which will correspond to marker's location
    });
};

var Map = React.createClass({
	mixins: [Navigation, FluxMixin],
	getInitialState: function() {
        this.parkingMarkers = {};
        this.parkings = {};
		return {
			width: $(window).width(),
			height: $(window).height()
		}
	},
    componentDidMount: function() {
        this.map = L.map(this.getDOMNode(), {
			center: [55.7522200, 37.6155600],
			zoom: 12,
            minZoom: 2,
            maxZoom: 20,
            zoomControl: false,
            layers: [
                L.tileLayer(
                    'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png',
                    {attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
                id: 'trashgenerator.ih4locjo'})
            ],

            attributionControl: false
        });
        this.getFlux().store("ParkingStore")
            .on("loadParkingListSuccess", this._loadParkingListSuccess)
            .on("loadCurrentParking", this._loadCurrentParking)
            .on("unselectCurrentParking", this._unselectCurrentParking)
            .on("editLocation", this._editLocation)
            .on("editLocationCancel", this._editLocationCancel)
            .on("editLocationDone", this._editLocationDone)
        this.getFlux().actions.loadParkingList();

    },
    componentWillUnmount: function() {
        this.map = null;
    },
    render: function() {
        // style={{width:this.state.width, height: this.state.height}}
        return (
            <div className='map'></div>
        );
    },
	onMarkerClick: function (id) {
		this.transitionTo("Parking", {"id": id});
	},

    _loadParkingListSuccess: function() {
        var store = this.getFlux().store("ParkingStore");
        _.forEach(store.parkingList, function (parking) {
            var ic = store.currentParkingId && parking.id == store.currentParkingId ? getActiveIcon(parking.status) : getIcon(parking.status);
            this.parkingMarkers[parking.id] = L.marker(parking.latLng.coordinates, {icon: ic}).on('click', this.onMarkerClick.bind(this, parking.id)).addTo(this.map);
            this.parkings[parking.id] = parking;
        }.bind(this));
        console.log(this.parkingMarkers)
    },

    _loadCurrentParking: function () {
        var store = this.getFlux().store("ParkingStore");
        _.map(this.parkingMarkers, function (marker, parkingId) {
            marker.setIcon(getIcon(this.parkings[parkingId].status));
        }.bind(this));
        if (this.parkingMarkers[store.currentParkingId]) {
            this.parkingMarkers[store.currentParkingId].setIcon(getActiveIcon(this.parkings[store.currentParkingId].status));
        }
    },

    _unselectCurrentParking: function() {
        var store = this.getFlux().store("ParkingStore");
        _.map(this.parkingMarkers, function (marker, parkingId) {
            marker.setIcon(getIcon(this.parkings[parkingId].status));
        }.bind(this));
    },

    /**
     * make current marker parking draggable. update store, when dragged
     * @private
     */
    _editLocation: function() {
        var store = this.getFlux().store("ParkingStore");

        var oldMarker = this.parkingMarkers[store.currentParkingId];

        this.parkingMarkers[store.currentParkingId] = L.marker(oldMarker.getLatLng(), {
            icon: getActiveIcon(this.parkings[store.currentParkingId].status),
            draggable: true
        }).addTo(this.map);

        this.parkingMarkers[store.currentParkingId].on('dragend', function (e) {
            this.getFlux().actions.changeCurrentParkingTemporaryPosition(
                this.parkingMarkers[store.currentParkingId].getLatLng()
            );
        }.bind(this));

        this.map.removeLayer(oldMarker);
    },

    /**
     * make current parking marking not draggable
     * @private
     */
    _editLocationDone: function() {
        var store = this.getFlux().store("ParkingStore");

        var oldMarker = this.parkingMarkers[store.currentParkingId];

        this.parkingMarkers[store.currentParkingId] = L.marker(oldMarker.getLatLng(), {
            icon: getActiveIcon(this.parkings[store.currentParkingId].status),
            draggable: false
        }).on('click', this.onMarkerClick.bind(this, store.currentParkingId))
            .addTo(this.map);

        this.map.removeLayer(oldMarker);
    },

    /**
     * make current parking marking not draggable
     * TODO: same as _editLocationDone
     * @private
     */
    _editLocationCancel: function() {
        var store = this.getFlux().store("ParkingStore");

        var oldMarker = this.parkingMarkers[store.currentParkingId];

        this.parkingMarkers[store.currentParkingId] = L.marker(store.getCurrentParking().latLng.coordinates, {
            icon: getActiveIcon(this.parkings[store.currentParkingId].status),
            draggable: false
        }).on('click', this.onMarkerClick.bind(this, store.currentParkingId))
            .addTo(this.map);

        this.map.removeLayer(oldMarker);
    }
});

module.exports = Map;