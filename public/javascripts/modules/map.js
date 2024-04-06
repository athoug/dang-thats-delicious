import axios from 'axios';
import { $ } from './bling';

// let's get a map to load, then worry about getting data
// to do that we need some map options
// to know more about teh options checkout the docs of google maps
const mapOptions = {
	center: { lat: 43.2, lng: -79.8 },
	zoom: 10,
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
	// we will hit our endpoint with the lat and lng values
	axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`).then((res) => {
		// we get our data from our api endpoint
		const places = res.data;
		// we first check if there are places
		if (!places.length) {
			alert('no places found!');
			return;
		}

		// --- create a bounds ---
		// we are having some issues with the zoom level and instead of guessing we will use something called bound which
		// will center the map around the markers
		const bounds = new google.maps.LatLngBounds();
		// and now when we loop over the places we will extend te bounds so it would fit

		// now we want to create an info window (which is the data they get when hovering over the marker)
		const infoWindow = new google.maps.InfoWindow();

		// but if we do have places, hen we want to do a whole bunch of markers
		const markers = places.map((place) => {
			const [placeLng, placeLat] = place.location.coordinates;

			// now we need to make a position object for google mao
			const position = {
				lat: placeLat,
				lng: placeLng,
			};

			// extend the bound
			bounds.extend(position);

			// now we can make our actual marker
			// it will take a couple of things
			// a map
			// a position
			const marker = new google.maps.Marker({
				map,
				position,
			});

			// now we need to attach the place data to that marker
			marker.place = place;

			// finally we return the marker
			return marker;
		});

		// now we want to loop over each of those markers and attach an event lister so that when someone clicks on it they get teh info window
		markers.forEach((marker) => {
			// addListner is teh google maps equivalent of add event listener
			marker.addListener('click', function () {
				// we can set the html for the info window
				const html = `
				  <div class="popup">
				    <a href="/stores/${this.place.slug}">
				      <img src="/uploads/${this.place.photo || 'store.png'}" alt="${
					this.place.name
				}" />
				      <p>${this.place.name} - ${this.place.location.address}</p>
				    </a>
				  </div>
				`;

				// const html = `
				//   <div class="popup">
				//     <a href="/stores/${this.place.slug}">
				//       <img src="/uploads/${this.place.photo || 'store.png'}" alt="${
				// 	this.place.name
				// }" />
				//       <p>${this.place.name} - ${this.place.location.address}</p>
				//     </a>
				//   </div>
				// `;
				infoWindow.setContent(html);
				// where do we want the window to appear in
				// well our map, at the marker position
				infoWindow.open(map, this);
			});
		});

		// then zoom the map to fit all the markers perfectly
		// again the bounds is a place around our pins
		map.setCenter(bounds.getCenter());
		map.fitBounds(bounds);
	});
}

// note we can get the map to render and work because in out layout we loaded a script to the google maps api
function makeMap(mapDiv) {
	// if the map dive doesn't exist in the page, exit
	if (!mapDiv) return;

	// let's make the map
	// the map method takes in two things
	// 1- where should it go (dom element)
	// 2- the options
	const map = new google.maps.Map(mapDiv, mapOptions);

	// once we have out map we will run loadplaces, and pass it the map
	loadPlaces(map);

	// now we need to hook up the geo search location
	// 1- grab the input
	const input = $('[name="geolocate"');

	// 2- we make it auto complete like we did before when adding the form search in create store
	// we pass it the input so it know what to work on
	const autocomplete = new google.maps.places.Autocomplete(input);
	// and when someone changes the autocomplete we will also run load places

	// now we need to listen for when the autocomplete changes
	autocomplete.addListener('place_changed', () => {
		// we update the place
		const place = autocomplete.getPlace();

		// now that we updated the place
		// we need to call our function load places
		loadPlaces(
			map,
			place.geometry.location.lat(),
			place.geometry.location.lng()
		);
	});
}

export default makeMap;
