// we need axios for this
// axios is a library similar to fetch but with some defaults and ability to cancel requests
import axios from 'axios';
// because we have forms and inputs we are vulnerable to SSX attacks so security wise we need to sanitize our html
import dompurify from 'dompurify';

// renders the html for the results - as in the UI
function searchResultsHTML(stores) {
	return stores
		.map((store) => {
			return `
      <a class="search__result" href="/stores/${store.slug}">
        <strong>${store.name}</strong>
      </a>
    `;
		})
		.join('');
}

function typeAhead(search) {
	// if there is no search input just exits
	if (!search) return;
	// this will work by us listening for when someone types in the search box
	// when someone types we will hit our api end point with the value in the search box
	// wait for the results to comeback and maybe make a dropdown value
	// let's start simple

	// when someone types into the search let's log the value
	// first thing, we need the input and results
	const searchInput = search.querySelector('input[name="search"]');
	const searchResults = search.querySelector('.search__results');

	// add an event to the search input
	// on is a shorthand for .addEventListener in the bling script
	searchInput.on('input', function () {
		console.log(this.value);
		// if there is no value, we want to hide the search results and return
		if (!this.value) {
			// set the style to none
			searchResults.style.display = 'none';
			// exit
			return;
		}

		// otherwise, show the search results and reset the value for the new search
		searchResults.style.display = 'block';

		// we use axios to hit our api endpoint
		axios
			.get(`/api/search?q=${this.value}`)
			.then((res) => {
				// if we have a response data then
				if (res.data.length) {
					const html = searchResultsHTML(res.data);
					searchResults.innerHTML = dompurify.sanitize(html);
					return;
				}

				// tell them nothing came back
				searchResults.innerHTML = dompurify.sanitize(
					`<div class="search__result">No results for ${this.value} found!</div>`
				);
			})
			.catch((err) => {
				console.error(err);
				// we can also either send it to ourself or if we have sentry setup we can see a log of the errors
			});
	});

	// now we want to handel keyboard inputs for when we get results for easier user interaction
	searchInput.on('keyup', (e) => {
		// if they aren't pressing up, down or enter, who cares
		if (![38, 40, 13].includes(e.keyCode)) {
			return; // nah, skip it
		}

		// otherwise
		console.log('do something');
		// 1. we need an active class to mark each one as active
		const activeClass = 'search__result--active';
		// we first select. the active class to know where we are
		const current = search.querySelector(`.${activeClass}`);
		// then we select all the items
		const items = search.querySelectorAll('.search__result');
		// we then need a let variable called next
		let next; // reason it's let is because the value will change based on what they press (up or down)

		if (e.keyCode === 40 && current) {
			// meaning they pressed down and there exists a current item
			// then the next one will be
			next = current.nextElementSibling || items[0]; // the reason for the or is if I am on the last one, it will loop back to the first since there's no next sibling for last element
		} else if (e.keyCode === 40) {
			next = items[0]; // if we pressed down and no current element is active then just set it to the first one
		} else if (e.keyCode === 38 && current) {
			// if they pressed up and there exists an active item
			next = current.previousElementSibling || items[items.length - 1]; // or the last item
		} else if (e.keyCode === 38) {
			next = items[items.length - 1];
		} else if (e.keyCode === 13 && current.href) {
			// if someone presses enter and there is a current element with a href value on it
			// then we need to navigate them to it
			window.location = current.href;
			return; // exit the function
		}

		// now that we have our next we need to add the active class to it and remove it from the current
		if (current) {
			current.classList.remove(activeClass);
		}
		next.classList.add(activeClass);
	});
}

export default typeAhead;
