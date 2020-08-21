// require('dotenv').config();

const express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	flash = require('connect-flash'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	methodOverride = require('method-override'),
	User = require('./models/user'),
	connectDB = require('./helpers/db');
serveStatic = require('serve-static');

// Connect to database
connectDB();

// MAKING APP USE BODYPARSER
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(flash());
app.locals.moment = require('moment');

var session = require('express-session');
var MemoryStore = require('memorystore')(session);
app.use(
	session({
		cookie: { maxAge: 86400000 },
		store: new MemoryStore({
			checkPeriod: 86400000
		}),
		secret: 'its Nilesh again.',
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Make currentUser available to every route
//ADD CURRENTLY LOGGED IN USER'S DATA TO ALL TEMPLATES
app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	// Move on to the next line of code wherever this function is placed
	next();
});

//NOTIFICATIONS FEATURE

app.use(async function(req, res, next) {
	res.locals.currentUser = req.user;
	if (req.user) {
		try {
			let user = await User.findById(req.user._id).populate('notifications', null, { isRead: false }).exec();
			res.locals.notifications = user.notifications.reverse();
		} catch (err) {
			console.log(err.message);
		}
	}
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
});

/* *******************************************
*  The require routes
**********************************************/
const commentRoutes = require('./routes/questionsforum');
app.use('/cloudcanineads/:id/comments', commentRoutes);

const advertRouting = require('./routes/cloudcanineads');
app.use('/cloudcanineads', advertRouting);

const reviewRoutes = require('./routes/reviews');
app.use('/cloudcanineads/:id/reviews', reviewRoutes);

const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

const userRoutes = require('./routes/users');
app.use('/cloudcanineads/:id/users', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
