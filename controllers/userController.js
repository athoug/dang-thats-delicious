// 1. we need to import mongoose
const mongoose = require('mongoose');
// get the user model
const User = mongoose.model('User');

// we also need a library called promisify
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
	// doesn't need to be async because all we will do is render
	res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
	res.render('register', { title: 'Register' });
};

// middleware for register
exports.validateRegister = (req, res, next) => {
	// first thing we need to make sure there are no scripts
	// now what that hell is this sanitizeBody, well in the begging wes added a couple of
	// packages and used them in our app.js file
	// in this case it's the expressValidator and we used it bellow and what it does is
	// apply a bunch of validation methods on every single request
	req.sanitizeBody('name'); // make sure the name is not a script
	req.checkBody('name', 'You must supply a name').notEmpty(); // check it's not empty
	req.checkBody('email', 'That email is not valid').isEmail(); // check it's a proper email
	req.sanitizeBody('email').normalizeEmail({
		// remove_dots: false,
		remove_extension: false,
		gmail_remove_subaddress: false,
	}); // normalize the email
	req.checkBody('password', 'Password can not be blank!').notEmpty(); // check that the password felid isn't blank
	req
		.checkBody('password-confirm', 'Confirm Password can not be blank!')
		.notEmpty(); // check that the password felid isn't blank
	// check that the passwords are the same
	req
		.checkBody('password-confirm', 'Oops! Your passwords do not match')
		.equals(req.body.password);

	const errors = req.validationErrors();
	if (errors) {
		req.flash(
			'error',
			errors.map((err) => err.msg)
		);

		// redirect back to the register page but keep the values
		res.render('register', {
			title: 'Register',
			body: req.body,
			flashes: req.flash(),
		});

		return; // stop the function from running
	}
	next(); // there were no errors
};

// a middleware for registering the user
exports.register = async (req, res, next) => {
	// we create the user
	const user = new User({
		email: req.body.email,
		name: req.body.name,
	});
	// we didn't call .save on it because we will be using .register
	// because it's the method that will take the password and hash it
	// save it to the database
	// but where did the .register come from?
	// well in our User model we did add a plugin passport and it came  with it
	// User.register(user, req.body.password, function (err, user) {});
	// 👆🏼 now this is the old approach that uses callbacks because the package doesn't use promises
	// we will change that with the promisify library and the way to do it is as follows
	// 1 - create a function
	// we assign it promisify and pass it 2 things
	// 1. the method you want to promisify
	// 2. which object to bind to
	const registerWithPromise = promisify(User.register, User);
	// 2- you can call it and await it by passing the user and password you wish to use
	await registerWithPromise(user, req.body.password);
	// when everything happens successfully we pass the control
	next(); // pass to authController.login (we didn't do that yet)
};

exports.account = (req, res) => {
	res.render('account', { title: 'Edit Your Account' });
};

exports.updateAccount = async (req, res) => {
	// take all the data the user sent, and update the account with it
	const updates = {
		name: req.body.name,
		email: req.body.email,
	};

	// now we will take our user model and call findOneAndUpdate
	// it will take 3 things
	// 1- the query
	// 2- the updates
	// 3- some options
	const user = await User.findByIdAndUpdate(
		{ _id: req.user._id },
		{ $set: updates },
		{
			new: true, // returns the new user
			runValidators: true,
			context: 'query', // this is required for mongoose to do teh query properly
		}
	);

	req.flash('success', 'Updated the profile!');

	res.redirect('back');
};
