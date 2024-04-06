// where we configure passport to work with our application

// 1. we need to import the libraries/packages we need
// we need passport, mongoose and our user model
const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

// 2. we create a strategy for the user model
// the reason this works is because of the passport plugin we did in the model
passport.use(User.createStrategy());

// 3. then we need. to tell passport what to do with the actual user
// when we login it will ask, okay what information do you want on the actual request?
// in our case, we just want to pass along the actual user object so we can do things
// like the avatar, show the stores they created and do stuff for that specific user
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// 4. we need to import this file somewhere in our app to actually use it
// and we do that in app.js
