const CloudCaninead = require('../models/cloudcaninead');
const cloudcanineQuestion = require('../models/questionforum');
const Review = require('../models/review');

// all the middleare goes here
const middlewareObj = {};

middlewareObj.checkAdOwnership = function(req, res, next) {
	if (req.isAuthenticated()) {
		CloudCaninead.findById(req.params.id, function(err, foundCloudcanineAd) {
			if (err) {
				req.flash('error', 'CloudCaninead not found');
				res.redirect('back');
			} else {
				// does user own the cloudcaninead?
				if (foundCloudcanineAd.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that");
					res.redirect('back');
				}
			}
		});
	} else {
		req.flash('error', 'You need to be logged in to do that');
		res.redirect('back');
	}
};

/**
 * Feature: Comments / Question and Answer
 * 
 */
middlewareObj.cloudcanineQuestionOwner = function(req, res, next) {
	if (req.isAuthenticated()) {
		cloudcanineQuestion.findById(req.params.questionforum_id, function(err, retrieveQuestion) {
			if (err) {
				res.redirect('back');
			} else {
				// does user own the question?
				if (retrieveQuestion.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that");
					res.redirect('back');
				}
			}
		});
	} else {
		req.flash('error', 'You need to be logged in to do that');
		res.redirect('back');
	}
};

/* **************************************************************************************
*    Title: Ratings and Review source code
*    Author: Maslaric, Zarco
*    Date: 2018
*    Code version: 2.0
*    Availability: https://github.com/zarkomaslaric/yelpcamp-review-system
*     (Version 2.0) [Source code]. https://github.com/zarkomaslaric/yelpcamp-review-system
***************************************************************************************/

middlewareObj.checkReviewOwnership = function(req, res, next) {
	if (req.isAuthenticated()) {
		Review.findById(req.params.review_id, function(err, foundReview) {
			if (err || !foundReview) {
				res.redirect('back');
			} else {
				// does user own the comment?
				if (foundReview.author.id.equals(req.user._id)) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that");
					res.redirect('back');
				}
			}
		});
	} else {
		req.flash('error', 'You need to be logged in to do that');
		res.redirect('back');
	}
};

/**
 * checkReviewExistence: it checks if the user already reviewed the advert and disallows further actions if they did.
 * 
 * 
 */

middlewareObj.checkReviewExistence = function(req, res, next) {
	if (req.isAuthenticated()) {
		// Find the advert, use the populate method to get all reviews
		// and check the each review author contained in that array with the id of the currently logged in user.
		CloudCaninead.findById(req.params.id).populate('reviews').exec(function(err, foundCloudcanineAd) {
			if (err || !foundCloudcanineAd) {
				req.flash('error', 'CloudCaninead not found.');
				res.redirect('back');
			} else {
				// check if req.user._id exists in foundcloudcaninead.reviews
				var foundUserReview = foundCloudcanineAd.reviews.some(function(review) {
					// use the some() array method to return true if any element of the array
					//matches the check that we implement (Author_ID matched user_ID)
					return review.author.id.equals(req.user._id);
				});
				// disable add new review button
				if (foundUserReview) {
					req.flash('error', 'You already wrote a review.');
					return res.redirect('/cloudcanineads/' + foundCloudcanineAd._id);
				}
				// if the review was not found, go to the next middleware
				next();
			}
		});
	} else {
		req.flash('error', 'You need to login first.');
		res.redirect('back');
	}
};

middlewareObj.isLoggedIn = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('error', 'You need to be logged in to do that');
	res.redirect('/login');
};

module.exports = middlewareObj;
