// what this will do is
// load everything up
require('dotenv').config({ path: __dirname + '/../variables.env' });
const fs = require('fs');

// connect to the database
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises

// bring in our models
// import all of our models - they need to be imported only once
const Store = require('../models/Store');
const Review = require('../models/Review');
const User = require('../models/User');

// then read the files form store.json, reviews.json, and users.json
// which will load them up into some objects
const stores = JSON.parse(fs.readFileSync(__dirname + '/stores.json', 'utf-8'));
const reviews = JSON.parse(
	fs.readFileSync(__dirname + '/reviews.json', 'utf-8')
);
const users = JSON.parse(fs.readFileSync(__dirname + '/users.json', 'utf-8'));

async function deleteData() {
	console.log('😢😢 Goodbye Data...');
	await Store.remove();
	await Review.remove();
	await User.remove();
	console.log(
		'Data Deleted. To load sample data, run\n\n\t npm run sample\n\n'
	);
	process.exit();
}

// this function will insets many stores, reviews, and data
async function loadData() {
	try {
		await Store.insertMany(stores);
		await Review.insertMany(reviews);
		await User.insertMany(users);
		console.log('👍👍👍👍👍👍👍👍 Done!');
		process.exit();
	} catch (e) {
		console.log(
			'\n👎👎👎👎👎👎👎👎 Error! The Error info is below but if you are importing sample data make sure to drop the existing database first with.\n\n\t npm run blowitallaway\n\n\n'
		);
		console.log(e);
		process.exit();
	}
}
if (process.argv.includes('--delete')) {
	deleteData();
} else {
	loadData();
}
