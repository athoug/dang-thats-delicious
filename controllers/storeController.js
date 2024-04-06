// in order to work with the database, we need to import mongoose
// mongoose is the package we use to interface with the database
const mongoose = require('mongoose');
// we also need a reference to our store Schema
// and rather that import it directly to the file, because we already imported it once in the `start.js` file
// we can simply reference it off the mongoose variable
// mongoose uses a concept called  a singleton which allows us to only import our models only once and reference them anywhere in our app
// and where did we get that capital S for store from, it's back in our store model file where we wrote
// module.exports = mongoose.model('Store', StoreSchema);
const Store = mongoose.model('Store');
const User = mongoose.model('User');

// external middleware package to handel file uploads in express
const multer = require('multer');
// external middleware package to resize images
const jimp = require('jimp');
// external middleware to package handel unique ids
const uuid = require('uuid');

// we need to setup some options for multer before we make our middleware route
const multerOptions = {
	// where the file will be stored when uploaded
	storage: multer.memoryStorage(),
	//what types of files are allowed
	fileFilter: (req, file, next) => {
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto) {
			next(null, true);
		} else {
			next({ message: 'That file type is not allowed' }, false);
		}
	},
};

exports.homePage = (req, res) => {
	console.log(req.name);
	res.render('index');
};

exports.addStore = (req, res) => {
	res.render('editStore', { title: 'Add Store' });
};

// our middleware to work with photos - save it in memory (a temporary storage place)
exports.upload = multer(multerOptions).single('photo');

// our other middleware to handel file resizing
exports.resize = async (req, res, next) => {
	// check if there is no new file to resize
	if (!req.file) {
		// if there's no request we'll just pass control to the next function
		next();
		return;
	}
	const extension = req.file.mimetype.split('/')[1];

	req.body.photo = `${uuid.v4()}.${extension}`; // setting the name

	// now we resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);

	// once we have written the photo our filesystem, keep going
	next();
};

exports.createStore = async (req, res) => {
	// update: before we create the store
	// we need to set the author and we do that by getting the user from
	// by doing so when we create a store, we can populate the author data
	req.body.author = req.user._id;
	// lets talk about how to store data
	// we start off by creating an instance of store using the constructor
	// and pass it an object that matches the schema
	const store = await new Store(req.body).save();

	// this is how you request a flash
	// it is available to us because we added it in out `app.js` file as a middleware
	// it takes 2 things
	// 1. the type of flash (succuss, error, warning, info. you can even make up your own category)
	// 2. a message string
	req.flash(
		'success',
		`Successfully created ${store.name}. Care to leave a review?`
	);
	res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) => {
	// --- this is what we need for pagination ---
	// we need to get the page number we are on
	// so ideally we get it from the params but if we are on the homepage
	// we have it set as 1
	const page = req.params.page || 1;
	//  then we need a limit, how many do you want to show per page
	const limit = 4;
	// then we need a skip for how many stores to skip when we hit next
	const skip = page * limit - limit;
	// 1. query the database for a list of all stores
	// this query is updated for the pagination
	const storesPromise = Store.find()
		.skip(skip)
		.limit(limit)
		.sort({ created: 'desc' });
	const countPromise = Store.count();

	const [stores, count] = await Promise.all([storesPromise, countPromise]);

	// now we can figure the number of pages where we need to get the upper limit
	// of number of stores divided by how many there are on page
	const pages = Math.ceil(count / limit);

	// before rendering the view we need to check for that if someone goes to a page
	// that is out of bound
	if (!stores.length && skip) {
		// if we don't have stores and there is a skip value
		// we want to redirect them to the last page of the pagination
		req.flash(
			'info',
			`Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`
		);
		res.redirect(`/stores/page/${pages}`);
		return;
	}
	// 2. render the stores view
	res.render('stores', { title: 'Stores', stores, page, count, pages });
};

// before the edit the store we need to make sure they are the owner
const confirmOwner = (store, user) => {
	// if the author isn't the same as the logged in user
	if (!store.author.equals(user._id)) {
		throw Error('You must own a store in order to edit');
	}
};

exports.editStore = async (req, res) => {
	// 1. find the store given the ID
	// the find one method takes ina query / condition
	const store = await Store.findOne({ _id: req.params.id });

	// 2. confirm that they are the owner of the store
	confirmOwner(store, req.user);

	// 3. render out the edit form so the user can update
	res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
	// 1. set the location data to be a point
	req.body.location.type = 'Point';
	// 2. find and update the store
	// findOneAndUpdate takes 3 parameters (the query, data, some options)
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // will return the new store instead of the old one
		runValidators: true,
	}).exec();

	// 3. redirect to the store and tell them it worked
	req.flash(
		'success',
		`Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store ⟶</a>`
	);
	res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
	// 1. query that database for that specific store
	const store = await Store.findOne({ slug: req.params.slug }).populate(
		'author reviews'
	); // the populate will grab the user data as well
	// 2. check if the store exists
	if (!store) {
		return next();
	}
	res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
	// update: handling multiple quires asynchronously

	// 1. move tags up - if selected grab the selected tag
	const tag = req.params.tag;
	const tagQuery = tag || { $exists: true }; // what this will do is if there is no tag, it will fall back to the second query which is just give me any store that has a tag property on it
	// 2. get a list of all the tags and stores
	// update: we now store the promise
	const tagsPromise = Store.getTagsList(); // now go the the schema and create this method
	const storePromise = Store.find({ tags: tagQuery });
	// we now have the promises but no real data but
	// what we can do is await for both of those things to come back
	// here's how to wait for multiple promises is with something called promise.all
	const [tags, stores] = await Promise.all([tagsPromise, storePromise]);
	// 3. render out the view and pass it the appropriate data
	res.render('tag', { tags, title: 'Tags', tag, stores });
	// res.json(tags);
};

exports.searchStores = async (req, res) => {
	// the find needs to take an argument which will tell us
	// to search for the name property & the description property
	// for whatever the person passes along with q
	// now because we indexed the fields as text we can use the mongoDB $text operator
	// it will perform a text search on any fields that are indexed with a text index
	const stores = await Store
		// first find stores that match
		.find(
			{
				// this is the operator
				$text: { $search: req.query.q },
			},
			{
				// we will tell it to project which basically means add a field
				// create a score field
				score: {
					// this score field is made up of
					// this is a mongo db meta data and it I think counts the occurrences of a word
					$meta: 'textScore',
				},
			}
		)
		// then sort them
		.sort({
			// we want to sort it based on our new meta property
			score: { $meta: 'textScore' },
		})
		// limit to only 5 results
		.limit(5);
	res.json(stores);
};

exports.mapStores = async (req, res) => {
	// the way we will hit this endpoint is with two queries
	// the lat, and the lng
	// mongoDB expects us to pass it as an array of lng & lat
	// note this turns it into a string so we need to map over it to turn it into a number
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

	// now that we have our coordinates, we make our query
	// it will be a big object so we store it in it's own variable
	const q = {
		// what we want to do is search for stores where the location property
		// is near!
		location: {
			$near: {
				// we will tell it that we are going to pass it geometry
				$geometry: {
					type: 'Point',
					coordinates,
				},
				// we also want to specify teh max distance
				$maxDistance: 10000, // = 10km
			},
		},
	};

	// now we get the stores
	// now we don't need all the information we want to keep it as small as possible
	// what we need is
	// - name
	// - slug
	// - description
	// - address
	// we can use the select method to specify the fields we want or which we don't want
	const stores = await Store.find(q)
		.select('name slug description location photo')
		.limit(10);

	res.json(stores);
};

exports.mapPage = (req, res) => {
	res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
	// we first need to get a list of the hearted stores
	// and se eif the hearted store is in the list?
	// if it is remove it, if it's not add it
	const hearts = req.user.hearts.map((obj) => obj.toString()); // we have an array of object and we want to convert it to an array of strings

	// now we will create variable that will check if our
	// hearts includes the current store id being posted
	// the operators explanation are: $pull (mongoDB removing from a list) while $addToSet (mongoDB add to list)
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	// we call the user and update it once we find it we pass it all teh data
	const user = await User.findByIdAndUpdate(
		req.user._id,
		{ [operator]: { hearts: req.params.id } },
		{ new: true } // this means it will return to us the updated user
	);
	res.json(user);
};

exports.getHearts = async (req, res) => {
	const stores = await Store.find({ _id: { $in: req.user.hearts } });

	res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
	// first we will get the top stores from a method
	// we created in the stores schema
	// rule of thumb, whenever you have a complex query never do that in the controller
	// pull it out to the model
	const stores = await Store.getTopStores();

	// render the top stores
	// res.json(stores);
	res.render('topStores', { title: '★ Top Stores!', stores });
};
