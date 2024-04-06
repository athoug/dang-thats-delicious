// 1. setup the requirements
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

// 2. create the schema
const reviewSchema = new Schema({
	createdDate: {
		type: Date,
		default: Date.now,
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author',
	},
	store: {
		type: mongoose.Schema.ObjectId,
		ref: 'Store',
		required: 'You must supply a store',
	},
	text: {
		type: String,
		required: 'Your review must have text',
	},
	rating: {
		type: Number,
		min: 1,
		max: 5,
		required: 'You must include a rating',
	},
});

// we need to auto populate the author
function autoPopulate(next) {
	this.populate('author');
	next();
}

// we can add hooks for whenever this review is queried we automatically populate the author
// so we do not have to explicitly go in and ask for the author
reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

// 3. expose the module
module.exports = mongoose.model('Review', reviewSchema);
