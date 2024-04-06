// let's start from scratch creating a user model
// 1 - require all the needed packages & dependencies
// we need mongoose to work with the database
const mongoose = require('mongoose');
// we also need the schema
const Schema = mongoose.Schema;

// we also need to set the promise for mongoose here
mongoose.Promise = global.Promise;

// 👆🏼 now that we have our database requirements set, there are other
// dependencies we need to setup as well
const md5 = require('md5');
const validator = require('validator'); // a good validation package for node js
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose'); // middleware that handles authentication

// 2 - create the schema
// okay now that all that is set up we need to make our model
// and a model is what our data is going to look like
const userSchema = new Schema({
	// there are 5 things that will go into our schema
	email: {
		type: String,
		unique: true,
		lowercase: true, // this will always save your email as lowercase ( it's a middleware)
		trim: true,
		validate: [
			// first thing, how to validate
			validator.isEmail,
			// second is the error message if it fails validation
			'Invalid Email Address',
		], //we want to do custom validation to make sure this is a proper validation
		required: 'Please supply an email address',
	},
	name: {
		type: String,
		required: 'Please supply a name',
		trim: true,
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	// we are telling it that hearts is going to be an array of ID's that is related to stores
	hearts: [{ type: mongoose.Schema.ObjectId, ref: 'Store' }],
});

// adding a virtual field to the schema that it generates the value itself on
userSchema.virtual('gravatar').get(function () {
	// a gravatar is a global avatar and it uses md5 to hash teh emails and get the avatar
	const hash = md5(this.email);
	return `https://gravatar.com/avatar/${hash}?s=200`;
});

// we will let passport js do the heavy lifting of authentication
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

// we also need to include another plugin which is mongodb error handler
userSchema.plugin(mongodbErrorHandler); // this changes the ugly errors into readable understandable ones

// 3 - map and export teh schema
// now lets export that
module.exports = mongoose.model('User', userSchema);
// we use module.exports and note exports.whatEver because this is the main thing that will be exported
// from this file, and when we require it, that is the thing we are getting
