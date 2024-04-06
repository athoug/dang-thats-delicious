// import the database requirements
const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
	// grab the missing data - author from the request
	req.body.author = req.user._id;
	// the store from the params
	req.body.store = req.params.id;
	// create a new review
	const newReview = Review(req.body);
	// save the review
	await newReview.save();

	// give them a message that all is good
	req.flash('success', 'Review saved!');
	// take them back to the page
	res.redirect('back');
};
