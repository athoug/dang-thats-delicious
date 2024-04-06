function autocomplete(input, latInput, lngInput) {
	if (!input) return; //skip this function from running if there's no input in the page

	// we need to load the google maps api and wes already did it for us
	// this will allow us to use the google dropdown location api
	const dropdown = new google.maps.places.Autocomplete(input);

	// now we need to grab the lat and longs so we attach a listener to the dropdown
	// addListener is a google maps way to add an event listener
	// the event we are listening for is 'place_changed'
	dropdown.addListener('place_changed', () => {
		const place = dropdown.getPlace();
		latInput.value = place.geometry.location.lat();
		lngInput.value = place.geometry.location.lng();
	});

	// if someone hits enter on the address field, don't submit the form
	input.on('keydown', (e) => {
		if (e.keyCode === 13) {
			e.preventDefault();
		}
	});
}

export default autocomplete;
