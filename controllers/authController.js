// we need to import passport because it's the library that will help us with all teh authentication stuff
const passport = require('passport');
// a module to help us generate cryptic strings
const crypto = require('crypto');
// we need mongoes to get access to the user schema
const mongoose = require('mongoose');
const User = mongoose.model('User');
// to convert a callback to a promise
const promisify = require('es6-promisify');
// import the mail handler - to send emails
const mail = require('../handlers/mail');

// strategies is what is used to authenticate, in our case we will use a local strategy
// we won't be using the normal req, res functions but we will take advantage of teh passport package

// for authenticate we first give it
// - the strategy we want to use
// - a config object that will tell us a little bit about what to happen
exports.login = passport.authenticate('local', {
	// if it fails where should they go?
	failureRedirect: '/login',
	failureFlash: 'Failed login!',
	// now what if it succeeds
	successRedirect: '/',
	successFlash: 'You now logged in!',
});

// we need a logout method
exports.logout = (req, res) => {
	// to logout all you need to do is call the method on the request
	req.logout();
	// we need to tell them it worked so a flash message
	req.flash('success', 'You are now logged out! 👋');
	// we need to redirect them to the homepage
	res.redirect('/');
};

// a middleware to check if the user is logged in
exports.isLoggedIn = (req, res, next) => {
	// 1. check if the user is authenticated
	if (req.isAuthenticated()) {
		next(); // carry on, they are logged in
		return;
	}

	req.flash('error', 'Oops you must be logged in to do that!');
	res.redirect('/login');
};

// the forgot method for password reset
exports.forgot = async (req, res) => {
	// there are 4 different things need to happen here
	// 1. see if that user exists
	const user = await User.findOne({ email: req.body.email });
	// if there is no user then
	if (!user) {
		// we have to tell them it didn't work
		req.flash('error', 'No account with that email exists');
		return res.redirect('/login');
	}
	// 2.set reset tokens and expiry on their account
	// we need a long cryptic string and there is a module in node that can help us called crypto
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; // this is the time now plus an hour to get an hour from now
	await user.save(); // since we set new fields we need to save it
	// 3. send an email with the token
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	// we send an email
	await mail.send({
		user,
		subject: 'Password reset',
		resetURL,
		filename: 'password-reset', // this is for html rendering
	});
	// tell the user it worked
	req.flash('success', `you have been emailed a password reset link.`);
	// 4. redirect to login page
	res.redirect('/login');
};

// the reset method
exports.reset = async (req, res) => {
	// from that we are going to check
	// a. is there somebody with this token
	// b. is this token not yet expired
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() },
	});

	// if there is no user
	if (!user) {
		// just notify them
		req.flash('error', 'Password reset is invalid or has expired');
		return res.redirect('/login');
	}

	// but if there is a user, show the password reset form
	res.render('reset', { title: 'Reset your password' });
};

// middleware to confirm that both passwords are the same
exports.confirmedPasswords = (req, res, next) => {
	// because this is a simple one, we don't need to use a validator package
	if (req.body.password === req.body['password-confirm']) {
		// then all is good and give back control
		return next();
	}

	// tell them that they do not match
	req.flash('error', 'Passwords do not match');
	res.redirect('back');
};

// update password
exports.update = async (req, res) => {
	// we first need to find the user and make sure they are still within the time range
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() },
	});

	// if there is no user
	if (!user) {
		// just notify them
		req.flash('error', 'Password reset is invalid or has expired');
		return res.redirect('/login');
	}

	// finally if all the checks pass we go ahead and update the password
	// this setPassword is available to us because we used the passport plugin in our model
	// one setback is that it's callback-fy and not promise-ify so we need to convert it
	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);

	// we then need to get rid of the token and expires in our database and the way you do that in mongoDB is by setting them to undefined
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;

	// we need to update the user
	const updatedUser = await user.save();

	// we want to automatically log them in
	await req.login(updatedUser); // again we got the login method from the packages we used in our app and exposed into our request
	// finally we tell them it works
	req.flash(
		'success',
		'🕺🏻 Nice, your password has been reset, you are now logged in!'
	);

	// we redirect them to the homepage
	res.redirect('/');
};
