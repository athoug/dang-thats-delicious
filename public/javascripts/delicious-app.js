import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

// the $ is a shorthand for document.querySelector inside the bling script
autocomplete($('#address'), $('#lat'), $('#lng'));

// call the typeahead method and pass it the search box dom element
typeAhead($('.search'));

// make the map
makeMap($('#map'));

// select all our heart form
const heartForms = $$('form.heart');
// add an event lister
heartForms.on('submit', ajaxHeart);
