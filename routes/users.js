const express = require('express');
const router = express.Router();
const CloudCaninead = require('../models/cloudcaninead');
const middleware = require('../middleware');
const User = require('../models/user');

// Show User Profile Route
router.get('/users/:id', middleware.isLoggedIn, function(req, res) {
	User.findById(req.params.id, function(err, foundUser) {
		if (err) {
			req.flash('error', 'Something went wrong!');
			res.redirect('/');
		}
		CloudCaninead.find().where('author.id').equals(foundUser._id).exec(function(err, cloudcanineads) {
			if (err) {
				req.flash('error', 'Something went wrong!');
				res.redirect('/');
			}
			res.render('users/show', { user: foundUser, cloudcanineads: cloudcanineads });
		});
	});
});

// Update User Profile Route
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

module.exports = router;
