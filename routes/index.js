//=====================================================
//          SET UP EXPRESS-ROUTER.
//=====================================================

const express = require('express');
const router = express.Router();
const passport = require('passport');
const async = require('async');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/user');
const CloudCaninead = require('../models/cloudcaninead');
const Notification = require('../models/notification');
const middleware = require('../middleware');

//======================================================
//                  ROOT ROUTE
//======================================================

router.get('/', function(req, res) {
	res.render('landing');
});

//======================================================
//              AUTHENTICATION ROUTES
//======================================================

//======================================================
// SHOW AND HANDLE SIGN UP LOGIC - REGISTER
//======================================================

// show register form
router.get('/register', function(req, res) {
	res.render('register', { page: 'register' });
});

//handle sign up logic
router.post('/register', function(req, res) {
	const newCloudcanineMember = new User({
		userType: req.body.userType, // Private or Business
		username: req.body.username, // Unique Username
		firstName: req.body.inputFirstName, // Firstname or company name
		lastName: req.body.inputLastName, // Optional
		email: req.body.email, // Mandatory contact detail
		avatar: req.body.avatar, // optional
		bio: req.body.bio, // Some info about member
		phone: req.body.phone // Contact detail
	});

	// A SECRETCODE FOR USERS TO BE AUTHORISED AS ADMINISTRATOR
	if (req.body.adminCode === process.env.ADMIN_SECRET) {
		// The boolean value isAdmin defined in the Users model becomes true
		// when user enters the admin code correctly.
		newCloudcanineMember.isAdmin = true;
	}

	/* **************************************************************************************
*    Title: Online documentation for Login/Register feature
*    Availability:  http://www.passportjs.org/docs/ 
*    Other help and guidance found from : 
*    https://www.youtube.com/watch?v=CrAU8xTHy4M&t=736s
*    https://github.com/nax3t/yelp-camp-refactored/blob/master/routes/index.js
***************************************************************************************/

	User.register(newCloudcanineMember, req.body.password, function(err, user) {
		if (err) {
			console.log(err);
			return res.render('register', {
				error: err.message
			});
		}
		// The local strategy automatically salts and hashes the password befor
		// storing onto the database
		passport.authenticate('local')(req, res, function() {
			// If this function gets called, authentication was successful.
			// `req.user` contains the authenticated user.
			req.flash('success', 'Successfully Signed Up! Welcome to Cloud Canine ' + req.body.username);
			res.redirect('/cloudcanineads');
		});
	});
});

//======================================================
//      SHOW AND HANDLE LOGIN LOGIC - LOGIN
//======================================================
//show login form
router.get('/login', function(req, res) {
	res.render('login', { page: 'login' });
});

/** To handle the login logic, the login form is submitted to the server via the POST method.
 *  Using authenticate() with the local strategy will handle the login request. 
 * // http://www.passportjs.org/docs/
 */

router.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/cloudcanineads',
		failureRedirect: '/login',
		successFlash: 'Welcome back to Cloud Canine. You have successfully logged in!',
		failureFlash: 'Login failed: Invalid username or password.',
		failureFlash: true
	}),
	function(req, res) {}
);

// GET - Password change route + user authentication
router.get('/change', middleware.isLoggedIn, function(req, res) {
	res.render('change', { page: 'change' });
});

// POST - Password change route + user authentication
router.post('/change', middleware.isLoggedIn, function(req, res) {
	let userDetails = req.user || {};
	User.findOne({ _id: userDetails._id }, function(err, user) {
		if (!user) {
			// Testing password change
			console.log(user);
			console.log(typeof user);
			req.flash('error', 'Password reset token is invalid or has expired.');
			return res.redirect('back');
		}
		console.log('route/index, changing password for user id:', userDetails._id, ' email:', userDetails.email);
		if (req.body.password === req.body.confirm) {
			user.setPassword(req.body.password, function(err) {
				user.save(function(err) {
					req.logIn(user, function(err) {
						//done(err, user);
						console.log('route/index, password changed');
						req.flash('success', 'Success! Your password has been changed.');
						res.redirect('/cloudcanineads');
					});
				});
			});
		} else {
			console.log('route/index, password do not match.');
			req.flash('error', 'Passwords do not match.');
			return res.redirect('back');
		}
	});
	emailUser(userDetails);
});

/* **************************************************************************************
*    Title: Online documentation for Nodemailer
*    Availability:  https://nodemailer.com/about/
***************************************************************************************/
function emailUser(user) {
	var smtpTransport = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		auth: {
			user: 'nbgbpl@gmail.com',
			pass: process.env.GMAILPW
		}
	});

	var mailOptions = {
		to: user.email,
		from: 'nbgbpl@gmail.com',
		subject: 'Your password has been changed',
		text:
			'Hello ' +
			user.firstName +
			',\n\n' +
			'This is a confirmation that the password for your account ' +
			user.email +
			' has been updated\n'
	};
	smtpTransport.sendMail(mailOptions, function(err, info) {
		if (err) {
			console.log('route/index, email sending failed', err);
		} else {
			console.log('email sent: ' + info.response);
			req.flash('success', 'Email is sent');
			res.redirect('/login');
		}
	});
}

// Logout routes
router.get('/logout', function(req, res) {
	req.logout();
	req.flash('success', 'Logged you out!');
	res.redirect('/cloudcanineads');
});

// ===================================
// Password Forgot/Reset/Change Routes
// https://medium.com/mesan-digital/tutorial-3b-how-to-add-password-reset-to-your-node-js-authentication-api-using-sendgrid-ada54c8c0d1f
// ===================================

// generates token and Sends password reset email

// GET - Password forgot route
router.get('/forgot', function(req, res) {
	res.render('forgot');
});

/* **************************************************************************************
*    Title: An example demonstrating how to reset password 
*    Availability: ADAPTED FROM :https://www.codementor.io/@olatundegaruba/password-reset-using-jwt-ag2pmlck0//
***************************************************************************************/

// POST - Password forgot route
router.post('/forgot', function(req, res, next) {
	// async waterfall helps to make sure that each of the functions are performed synchronously
	async.waterfall(
		[
			function(done) {
				crypto.randomBytes(20, function(err, buf) {
					var token = buf.toString('hex');
					done(err, token);
				});
			},
			function(token, done) {
				// This function in the waterall search the database for user existence
				User.findOne({ email: req.body.email }, function(err, user) {
					if (!user) {
						req.flash('error', 'No account with that email address exists.');
						return res.redirect('/forgot');
					}
					// if it exists, a token is generated and updates the user object in the database
					// Further, the security is protected by having a timer in the link
					user.resetPasswordToken = token;
					user.resetPasswordExpires = Date.now() + 3600000; // Link expires in an hour
					// This serves as a means of confirming that you own the username/email entered.
					user.save(function(err) {
						done(err, token, user);
					});
				});
			},
			function(token, user, done) {
				var smtpTransport = nodemailer.createTransport({
					service: 'Gmail',
					auth: {
						user: 'nbgbpl@gmail.com',
						pass: process.env.GMAILPW
					}
				});
				var mailOptions = {
					to: user.email,
					from: 'nbgbpl@gmail.com',
					subject: 'Cloud Canine Password Reset',
					text:
						'Hi' +
						' ' +
						user.firstName +
						'\n\n' +
						'You recently requested to reset your password for Cloud Canine account. Please click on the link below to reset it. This password reset is only valid for the next 24 hours.\n\n' +
						'http://' +
						req.headers.host +
						'/reset/' +
						token +
						'\n\n' +
						'If you did not request a password reset, please ignore this email and your password will remain unchanged.\n\n' +
						'Thanks\n\n' +
						'The Cloud Canine Team'
				};

				smtpTransport.sendMail(mailOptions, function(err) {
					//console.log('mail sent');
					req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
					done(err, 'done');
				});
			}
		],
		function(err) {
			if (err) return next(err);
			res.redirect('/login');
		}
	);
});

router.get('/reset/:token', function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(
		err,
		user
	) {
		if (!user) {
			req.flash('error', 'Password reset token is invalid or has expired.');
			return res.redirect('/forgot');
		}
		res.render('reset', { token: req.params.token });
	});
});

router.post('/reset/:token', function(req, res) {
	async.waterfall(
		[
			function(done) {
				User.findOne(
					{ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } },
					function(err, user) {
						if (!user) {
							req.flash('error', 'Password reset token is invalid or has expired.');
							return res.redirect('back');
						}
						if (req.body.password === req.body.confirm) {
							user.setPassword(req.body.password, function(err) {
								user.resetPasswordToken = undefined;
								user.resetPasswordExpires = undefined;

								user.save(function(err) {
									req.logIn(user, function(err) {
										done(err, user);
									});
								});
							});
						} else {
							req.flash('error', 'Passwords do not match.');
							return res.redirect('back');
						}
					}
				);
			},

			function(user, done) {
				var smtpTransport = nodemailer.createTransport({
					service: 'Gmail',
					auth: {
						user: 'nbgbpl@gmail.com',
						pass: process.env.GMAILPW
					}
				});
				var mailOptions = {
					to: user.email,
					from: 'nbgbpl@gmail.com',
					subject: 'Password updated successfully',
					text:
						'Hi' +
						' ' +
						user.firstName +
						'\n\n' +
						'This is a confirmation that the password for your account ' +
						user.email +
						' has just been changed.\n'
				};
				smtpTransport.sendMail(mailOptions, function(err) {
					req.flash('success', 'Success! Your password has been changed.');
					done(err);
				});
			}
		],
		function(err) {
			res.redirect('/cloudcanineads');
		}
	);
});

// ===================================
// Contact form in the show page
// Online documentation: https://nodemailer.com/about/
// ===================================

router.post('/contactform', middleware.isLoggedIn, function(req, res) {
	User.findOne({ email: req.body.email }, function(err, user) {
		var transporter = nodemailer.createTransport({
			service: 'Gmail',
			auth: {
				user: 'nbgbpl@gmail.com',
				pass: process.env.GMAILPW
			}
		});

		var mailOptions = {
			from: req.body.name + ' &lt;' + req.body.email + '&gt;',
			to: user.email,
			subject: 'Message on your CloudCaninead advert',
			text: 'A message from ' + req.body.name + ' Email: ' + req.body.email + 'Message: ' + req.body.message,
			html:
				'<p>A message from: </p><ul><li>Name: ' +
				req.body.name +
				' </li><li>Email: ' +
				req.body.email +
				' </li><li>Message: ' +
				req.body.message +
				' </li></ul>'
		};

		transporter.sendMail(mailOptions, function(err, info) {
			if (err) {
				console.log(err);
				res.redirect('/cloudcanineads/');
			} else {
				console.log('Message sent');
				res.redirect('/cloudcanineads/');
			}
		});
	});
});

// ===================================
// End of contact form
// ===================================

// ===================================
// Get in touch with us (Business user)
// ===================================

// GET - Password forgot route
router.get('/getintouch', function(req, res) {
	res.render('getintouch');
});

router.post('/getintouch', middleware.isLoggedIn, function(req, res) {
	var transporter = nodemailer.createTransport({
		service: 'Gmail',
		auth: {
			user: 'nbgbpl@gmail.com',
			pass: process.env.GMAILPW
		}
	});

	console.log(user.email);

	var mailOptions = {
		from: req.body.name + ' &lt;' + req.body.email + '&gt;',
		to: 'nbgbpl@gmail.com',
		subject: 'Request to customise category (Business User)',
		text: 'A message from ' + req.body.name + ' Email: ' + req.body.email + 'Message: ' + req.body.message,
		html:
			'<p>A message from: </p><ul><li>Name: ' +
			req.body.name +
			' </li><li>Email: ' +
			req.body.email +
			' </li><li>Message: ' +
			req.body.message +
			' </li></ul>'
	};
	console.log(user.email);

	transporter.sendMail(mailOptions, function(err, info) {
		if (err) {
			console.log(err);
			res.redirect('/cloudcanineads/');
		} else {
			console.log('Message sent');
			res.redirect('/cloudcanineads/');
		}
	});
});

// ===================================
// End of get in touch with us (Business user)
// ===================================

/* **************************************************************************************
*    Title: Source code and help for creating a User profile
*    Availability: https://github.com/nax3t/yelp-camp-refactored/blob/profile/routes/index.js
*    Other help and guidance found from : 
*   https://www.youtube.com/watch?v=CrAU8xTHy4M&t=736s
*   https://www.youtube.com/watch?v=m2ZzRZemc98
***************************************************************************************/

// ===================================
// Feature : User Profile
// ===================================

router.get('/users/:id', function(req, res) {
	User.findById(req.params.id, function(err, foundUser) {
		if (err) {
			req.flash('error', 'Something went wrong.');
			return res.redirect('/');
		}
		CloudCaninead.find().where('author.id').equals(foundUser._id).exec(function(err, cloudcanineads) {
			if (err) {
				req.flash('error', 'Something went wrong.');
				return res.redirect('/');
			}
			res.render('users/show', { user: foundUser, cloudcanineads: cloudcanineads });
		});
	});
});

// ===================================
// Edit User Profile route
// ===================================
router.get('/users/:id/edit', middleware.isLoggedIn, function(req, res) {
	User.findById(req.params.id, function(err, foundUser) {
		res.render('users/edit', {
			user: foundUser
		});
	});
});

// ===================================
// Get User Profile route
// ===================================

router.get('/users/:id', async function(req, res) {
	try {
		let user = await User.findById(req.params.id).populate('followers').exec();
		res.render('profile', { user });
	} catch (err) {
		req.flash('error', err.message);
		return res.redirect('back');
	}
});

// ===================================
// Update User Profile route
// ===================================
router.put('/users/:id', middleware.isLoggedIn, function(req, res) {
	// Find and update the correct user profile
	User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser) {
		if (err) {
			req.flash('error', err.message);
			res.redirect('back');
		} else {
			req.flash('success', 'Successfully Updated!');
			res.redirect('/users/' + req.params.id);
		}
	});
});

/* **************************************************************************************
*    Title: post notification source code
*    Author: Ian Schoonover
*    Date: 2018
*    Code version: 2.0
*    Adapted from: https://github.com/nax3t/yelpcamp-user-notifications/blob/master/routes/index.js
****/

// ===================================
// Follow a specific user
// ===================================
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
	try {
		let user = await User.findById(req.params.id);
		user.followers.push(req.user._id);
		user.save();
		req.flash('success', 'Successfully followed ' + user.username + '!');
		res.redirect('/users/' + req.params.id);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

// ===================================
// View all notifications
// ===================================
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
	try {
		let user = await User.findById(req.user._id)
			.populate({
				path: 'notifications',
				options: { sort: { _id: -1 } }
			})
			.exec();
		let allNotifications = user.notifications;
		res.render('notifications/index', { allNotifications });
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

// ===================================
// Handle follower post notification
// ===================================
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
	try {
		let notification = await Notification.findById(req.params.id);
		notification.isRead = true;
		notification.save();
		res.redirect(`/cloudcanineads/${notification.cloudcanineID}`);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

module.exports = router;
