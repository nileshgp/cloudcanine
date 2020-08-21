var express = require('express');
var router = express.Router({ mergeParams: true });
var CloudCaninead = require('../models/cloudcaninead');
var cloudcanineQuestion = require('../models/questionforum');
var middleware = require('../middleware');

/* **************************************************************************************
*    Title: Questions/Answers source code
*    Author: Ian Schoonover
*    Date: 2016
*    Code version: 1.0
*    Availability: https://github.com/nax3t/webdevbootcamp/blob/master/YelpCamp/v10/routes/comments.js
*    Adapted from:  https://github.com/nax3t/webdevbootcamp/blob/master/YelpCamp/v10/routes/comments.js
***************************************************************************************/

module.exports = router;

/** 
 * This is a GET method route which sends a request to render the new question section
 * if the user is authenticated. Otherwise deny the request */

router.get('/new', middleware.isLoggedIn, function(req, res) {
	console.log(req.params.id);
	CloudCaninead.findById(req.params.id, function(err, cloudcaninead) {
		if (err) {
			console.log(err);
		} else {
			/**
             * Respond with new comments oage when a GET request is successful 
             **/
			res.render('questionsforum/new', { cloudcaninead: cloudcaninead });
		}
	});
});

/** 
 * This is a POST method route which sends a request to save the new question
 * once user is authenticated. Otherwise deny the request */

router.post('/', middleware.isLoggedIn, function(req, res) {
	CloudCaninead.findById(req.params.id, function(err, cloudcaninead) {
		if (err) {
			console.log(err);
			res.redirect('/cloudcanineads');
		} else {
			cloudcanineQuestion.create(req.body.questionforum, function(err, questionforum) {
				if (err) {
					req.flash('error', 'Something went wrong');
					console.log(err);
				} else {
					questionforum.author.id = req.user._id;
					questionforum.author.username = req.user.username;
					questionforum.save();
					cloudcaninead.questionsforum.push(questionforum);
					cloudcaninead.save();
					//console.log(questionforum);
					req.flash('success', 'Question posted on the forum');
					res.redirect('/cloudcanineads/' + cloudcaninead._id);
				}
			});
		}
	});
});

/** 
 * This is a GET method route which sends a request to collapse the edit section
 * once user is authenticated and they are owner of the question posted. Otherwise deny the request */
router.get('/:questionforum_id/edit', middleware.cloudcanineQuestionOwner, function(req, res) {
	cloudcanineQuestion.findById(req.params.questionforum_id, function(err, cloudcanineQuestionRetrieve) {
		if (!err) {
			//res.redirect("back");
			res.render('questionsforum/edit', {
				cloudcanine_id: req.params.id,
				questionforum: cloudcanineQuestionRetrieve
			});
		} else {
			res.redirect('back');
		}
	});
});

/** 
 * This is a PUT method route which sends a request to edit a particular qn ID and update it 
 * once user is authenticated and they are owner of the question edited. Otherwise deny the request */
router.put('/:questionforum_id', middleware.cloudcanineQuestionOwner, function(req, res) {
	cloudcanineQuestion.findByIdAndUpdate(req.params.questionforum_id, req.body.questionforum, function(
		err,
		updatedComment
	) {
		if (!err) {
			res.redirect('/cloudcanineads/' + req.params.id);
		} else {
			res.redirect('back');
		}
	});
});

/** 
 * This is a DELET method route which sends a request to delete and remove question from the database server 
 * Only admin and if they are owner of the question have privilege. Otherwise deny the request */
router.delete('/:questionforum_id', middleware.cloudcanineQuestionOwner, function(req, res) {
	cloudcanineQuestion.findByIdAndRemove(req.params.questionforum_id, function(err) {
		if (!err) {
			req.flash('success', 'the question has been removed successfully');
			res.redirect('/cloudcanineads/' + req.params.id);
		} else {
			res.redirect('back');
		}
	});
});
