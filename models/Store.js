// 1. we need a package called mongoose
// mongodb = is our database (can be used with any language python, java, php ...etc)
// mongoose = the package we use to interface (a way to interact with mongoDB in node and one of the most popular ones)
const mongoose = require('mongoose');

// 2. we need to tell mongoose that the promise to use is global.promise
// this means a way to wait for our database, whenever we query our database, there are different ways to wait for our data to
// come back from the database because it happens asynchronously
// we can use the built in callbacks, external libraries such as blue bird or what we will do is use the built in ES6 promises (because we'll use async await)
mongoose.Promise = global.Promise;

// 3. we need a library called slugs
// this will allow us to make url friendly slugs, just like a wordpress permalink
const slug = require('slugs');

// 4. no wwe go ahead and make our schema
// note: all our indexing will happen in our schema
const StoreSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			trim: true, // data normalization should be done in a schema level this here removes whitespace
			required: 'Please enter a store name!',
		},
		slug: String,
		description: {
			type: String,
			trim: true,
		},
		tags: [String],
		created: {
			type: Date,
			default: Date.now,
		},
		location: {
			type: {
				type: String,
				default: 'Point',
			},
			coordinates: [
				{
					type: Number,
					required: 'You must supply Coordinates!',
				},
			],
			address: {
				type: String,
				required: 'You must supply an Address!',
			},
		},
		photo: String,
		author: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: 'You must supply an author',
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// define our indexes
// we tell it which field we would like it to index
// with this index, it will allow us to search both those fields
StoreSchema.index({
	name: 'text',
	description: 'text',
});

StoreSchema.index({
	location: '2dsphere',
});

// now we will be entering the store name, description, and tags
// but the slug we want it to auto generate and the way to do it as follows
// before our schema is saved we are going to run a function
// we need to use  a proper function (not arrow) because we need access to `this` variable
StoreSchema.pre('save', async function (next) {
	// now this will run each time we save a store but we need to make it more efferent and only run it when the name is changed
	// so if the store name is not modified, just call next
	if (!this.isModified('name')) {
		next(); // skip it
		return; // stop this function from running
	}
	// what this will do is take the name we passed it, run it throw the slug package, and sets the slug property to whatever the out put of the slug is
	this.slug = slug(this.name);

	// find other stores with the same slug such as wes, wes-1, wes-2 ..etc
	// to do that we will make a regex for store that have a slug
	// 1. make a regex
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*)?)$`, 'i');
	// 2. we need to pass that regex onto a query
	// note that we used `this.constructor` because we still haven't created the store yet
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

	// 3. check if the slug exists
	if (storesWithSlug.length) {
		// we will overwrite the slug we created in the beginning
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}

	next(); // to give back control to the net function because remember this is a middleware and you always need to conclude a middleware with a next()
	// TODO - moke more resilient so slugs are unique
});

// we need to ad a method to our schema and the way to do it is to attach it to a static property
// we used a proper function because we need to access the `this` property that's binded to our model
// arrow functions won't work here
StoreSchema.statics.getTagsList = function () {
	// aggregate is another method that will help us find something in our database (such as find, findObe ...etc)
	// the difference is that it takes in an array of the posable things we are looking for
	return this.aggregate([
		// you can add the different arrogated methods which you can find in the docs
		// we have to pass it an object for each operator
		{ $unwind: '$tags' }, // this what it does it breaks the array tag into individual stores meaning if we have a store that has two tags (wifi, licensed) it creates 2 copies of store one for each tag
		{ $group: { _id: '$tags', count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
	]);
};

// we created in the stores schema
// rule of thumb, whenever you have a complex query never do that in the controller
// pull it out to the model
StoreSchema.statics.getTopStores = function () {
	// again aggregate is a query function that we can do much more complex things inside of it
	// and by returning it, it will return a promise that we can await the results of
	// so here are the steps of what we will do
	return this.aggregate([
		// 1. lookup stores, and populate their reviews
		{
			// lookup aggregate operator is for looking stuff up
			$lookup: {
				// note that mongoDb lower cases the model name that's why the from is a lower case 'review'
				// also see how similar this is to the mongoose virtual field
				from: 'reviews',
				localField: '_id',
				foreignField: 'store',
				as: 'reviews',
			},
		},
		// 2. filter for only stores with 2 or more reviews
		{
			// match is for matching a condition
			// reviews.1 means where the second item exists
			$match: { 'reviews.1': { $exists: true } },
		},
		// 3.  add the average reviews field
		// project means add a field
		{
			$project: {
				// create a new field called averageRating, and set the value of it to be
				// the average of each of the reviews rating field (it will do the math for us)
				// the $ sign means it's a field from the data being pipped in
				averageRating: { $avg: '$reviews.rating' },
				// now project removes all the data so we nee dto add them back in
				photo: '$$ROOT.photo',
				name: '$$ROOT.name',
				slug: '$$ROOT.slug',
				reviews: '$$ROOT.reviews',
			},
		},
		// 4. sort it by our new field, highest review first
		{ $sort: { averageRating: -1 } },
		// 5. limit to at most 10
		{ $limit: 10 },
	]);
};

// this is where we make a relationship between store and reviews by making a virtual property
// so this basically means, find reviews where the stores._id property === reviews.store property
StoreSchema.virtual('reviews', {
	// we will tell itt to go off another model (the reviews model) and do a quick query
	ref: 'Review', // what model to link?
	// local field means, which field in our store
	localField: '_id', // which field on the store?
	// needs to match up with field in our reviews
	foreignField: 'store', // which field on the review?
});

// a middleware to populate our stores with reviews
function autoPopulate(next) {
	this.populate('reviews');
	next();
}

StoreSchema.pre('find', autoPopulate);
StoreSchema.pre('findOne', autoPopulate);

// ==== IMPORTANT ====
// now we need to let mongodb actually know about this model
// and we do that in our statusbar.js file
// there is a block there called  --- READY?! Let's go!
// where you can do teh magic

// 5. finally export that sucker
// we used module as an export because it's the main and only thing to be imported
module.exports = mongoose.model('Store', StoreSchema);
