const express = require('express'),
	router = express.Router(),
	CloudCaninead = require('../models/cloudcaninead'),
	middleware = require('../middleware'),
	NodeGeocoder = require('node-geocoder'),
	multer = require('multer'),
	User = require('../models/user'),
	ModelConfig = require('../models/config'),
	Notification = require('../models/notification'),
	questionForum = require('../models/questionforum'),
	Review = require('../models/review'),
	CategorySubscriber = require('../models/categorySubscriber'),
	NotificationHelper = require('../helpers/notificationHelper'),
	CloudcanineadCategoryHelper = require('../helpers/cloudcanineadCategoryHelper'),
	upload = require('../helpers/cloudinary');

// ===================================
// Configure Google Maps Geocoding API
// https://developers.google.com/maps/documentation/geocoding/intro
// node-geocoder library is required for geocoding
// ===================================

const options = {
	provider: 'google',
	httpAdapter: 'https',
	apiKey: process.env.GEOCODER_API_KEY,
	formatter: null
};

const geocoder = NodeGeocoder(options);

// ===================================
// Cloudinary Configuration
// ===================================

const cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name: 'dafmnkmzb',
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========================================
// Index page - It displays all the adverts
// =========================================
router.get('/', function(req, res) {
	const perPage = 8;
	const pageQuery = parseInt(req.query.page);
	const pageNumber = pageQuery ? pageQuery : 1;

	const noMatch = null,
		CategoryMapping = ModelConfig['CategoryMapping'] || {},
		errorMsg = null,
		searchPage = false;

	// Get all cloudcanineads from DB
	console.log('cloudcaninead get route: getting all cloudcaninead');

	CloudCaninead.find({}).skip(perPage * pageNumber - perPage).limit(perPage).exec(function(err, allCloudcanineAds) {
		CloudCaninead.count().exec(function(err, count) {
			if (err) {
				console.log(err);
				errorMsg = 'please try again';
			} else {
				// res.json(allCloudcanineAds);
				res.render('cloudcanineads/index', {
					cloudcanineads: allCloudcanineAds,
					noMatch: noMatch,
					errorMsg: errorMsg,
					categoryData: CategoryMapping,
					searchPage: searchPage,
					// pagination
					current: pageNumber,
					pages: Math.ceil(count / perPage)
				});
			}
		});
	});
});

router.get('/searchdata', function(req, res) {
	const perPage = 6;
	const pageQuery = parseInt(req.query.page);
	const pageNumber = pageQuery ? pageQuery : 1;

	let noMatch = null,
		CategoryMapping = ModelConfig['CategoryMapping'] || {},
		inputText = req.query.search,
		errorMsg = null,
		currCatInfo = {
			category: null,
			subCat: null
		};

	console.log('input text searchdata', inputText);
	if (inputText) {
		const regex = new RegExp(escapeRegex(inputText), 'gi');
		CloudCaninead.find({
			$or: [
				{ name: regex },
				{ location: regex },
				{ category: regex },
				{ subCategory: regex },
				{ description: regex } // Based on description
			]
		})
			// PAGINATION ON CATEGORY
			.skip(perPage * pageNumber - perPage)
			.limit(perPage)
			.exec(function(err, allCloudcanineAds) {
				CloudCaninead.count().exec(function(err, count) {
					// console.log(" searchdata route checking ", allCloudcanineAds)
					if (err) {
						console.log(err);
						errorMsg = 'please try again';
						noMatch = true;
						allCloudcanineAds = [];
					} else {
						if (allCloudcanineAds.length < 1) {
							allCloudcanineAds = [];
							noMatch = true;
							errorMsg = 'no matching result found';
						} else {
							console.log('sinlge item', allCloudcanineAds[0]);
							let singleCloudcanineadItem = allCloudcanineAds[0];
							currCatInfo.category = singleCloudcanineadItem.category;
							currCatInfo.subCat = singleCloudcanineadItem.subCategory;
						}
						res.render('cloudcanineads/index', {
							cloudcanineads: allCloudcanineAds,
							noMatch: noMatch,
							errorMsg: errorMsg,
							categoryData: CategoryMapping,
							searchPage: true,

							currCatInfo: currCatInfo,
							// pagination
							current: pageNumber,
							pages: Math.ceil(count / perPage)
						});
					}
				});
			});
	} else {
		res.render('cloudcanineads/index', {
			cloudcanineads: [],
			noMatch: true,
			errorMsg: 'please try again',
			categoryData: CategoryMapping,
			searchPage: true,
			currCatInfo: currCatInfo
		});
	}
});

// =================================================================
// ADD NEW ADVERT - This post method adds a new listing to Cloud Canine
// =================================================================

const getAllLocation = [];

router.post('/', middleware.isLoggedIn, upload.array('image', 5), async function(req, res) {
	let reqBody = req.body || {},
		userDetails = req.user || {},
		title = reqBody.title,
		desc = reqBody.description,
		author = {
			id: userDetails._id,
			username: userDetails.username
		},
		postCategory = reqBody.categoryName,
		subCategory = reqBody.subcategoryName,
		// =================================================================
		// Specific fields for the dog category to collect more info
		// =================================================================
		sex = reqBody.sex,
		mileage = reqBody.mileage,
		transmission = reqBody.transmission,
		birthdate = reqBody.birthdate,
		colour = reqBody.colour;

	// =================================================================
	// Location Code - Geocode Package
	// =================================================================

	geocoder.geocode(reqBody.location, async function(err, data) {
		//Error Handling For Autocomplete API Requests

		if (err || data.status === 'ZERO_RESULTS') {
			req.flash('error', 'Invalid address, try typing a new address');
			return res.redirect('back');
		}
		if (err || data.status === 'REQUEST_DENIED') {
			req.flash('error', 'Something Is Wrong Your Request Was Denied');
			return res.redirect('back');
		}
		if (err || data.status === 'OVER_QUERY_LIMIT') {
			req.flash('error', 'All Requests Used Up');
			return res.redirect('back');
		}

		console.log('success in getting lat long');
		var lat = data[0].latitude || 0;
		var lng = data[0].longitude || 0;
		var location = data[0].formattedAddress || '';

		var listLocation = [ lat, lng, location ];
		getAllLocation.push(listLocation);
		console.log('Check if loop 2' + getAllLocation);

		console.log(
			'route/cloudcanineads, cloudinary upload starting for subcategory:',
			subCategory,
			' user:',
			userDetails.username
		);
		let uploadUrls = await uploadImagesToCloudnary(req.files);
		console.log('route/cloudcanineads, cloudnary upload success ', uploadUrls);

		var price = reqBody.price;
		console.log('success in cloudinary upload');

		// =================================================================
		// All the fields for adding a new listing onto the Cloud Canine platform
		// =================================================================

		const postNewAd = {
			title: title,
			image: uploadUrls,
			description: desc,
			author: author,
			price: price,
			location: location,
			lat: lat,
			lng: lng,
			category: postCategory,
			subCategory: subCategory,
			sex: sex,
			mileage: mileage,
			transmission: transmission,
			birthdate: birthdate,
			colour: colour
		};
		try {
			let cloudcaninead = await CloudCaninead.create(postNewAd);
			let user = await User.findById(userDetails._id).populate('followers').exec();
			let newNotification = {
				username: userDetails.username,
				cloudcanineID: cloudcaninead.id
			};

			// =================================================================
			// Send an email alert to all users that have subscribed
			// to that specific category/sub-category
			// =================================================================

			for (const follower of user.followers) {
				let notification = await Notification.create(newNotification);
				follower.notifications.push(notification);
				follower.save();
			}

			let productDetail = {
					userId: userDetails.username,
					cloudcanineID: cloudcaninead.id
				},
				metaData = {
					host: req.headers.host
				};
			console.log('sending notifications to all subscribers for subcategory:', subCategory);
			// send notification to all subscribers
			NotificationHelper.sendEmailToSubscribers(subCategory, productDetail, metaData);
			//redirect back to listings page
			res.redirect(`/cloudcanineads/${cloudcaninead.id}`);
		} catch (err) {
			console.log('cloudcanineads/new post route: error in creating new post:', err);
			req.flash('error', err.message);
			res.redirect('back');
		}
	});
});

console.log('Check if loop' + getAllLocation);

/**
 * uploads images to cloudnary in series
 * @param filesData
 * @returns {Promise<unknown>}
 */

// =================================================================
// Upload images onto the Cloudinary environment
// =================================================================

function uploadImagesToCloudnary(filesData) {
	let filePaths = [],
		resultUrls = [];
	filesData.forEach(function(item) {
		filePaths.push(item.path);
	});
	return new Promise(async function(resolve, reject) {
		for (let i = 0; i < filePaths.length; i++) {
			await cloudinary.uploader.upload(filePaths[i], function(result) {
				if (i == filePaths.length - 1) {
					if (result) resultUrls.push(result.secure_url); // push last operation's url
					resolve(resultUrls);
				} else if (result) {
					resultUrls.push(result.secure_url);
					// console.log("secure url ",result.secure_url);
				} else {
					console.log('route/cloudcanineads, cloudnary upload of image is failed:');
				}
			});
		}
	})
		.then((result) => result)
		.catch((err) => err);
}

// =================================================================
// ADD NEW ADVERT - show form to create new cloudcaninead listing
// =================================================================

router.get('/new', middleware.isLoggedIn, function(req, res) {
	let CategoryMapping = ModelConfig['CategoryMapping'] || {};
	res.render('cloudcanineads/new', { categoryData: CategoryMapping });
});

// =================================================================
// SHOW page - shows more info about a specific cloudcaninead
// =================================================================

router.get('/:id', function(req, res) {
	//find the cloudcaninead with provided ID
	CloudCaninead.findById(req.params.id)
		.populate('questionsforum')
		.populate({
			path: 'reviews',
			options: { sort: { createdAt: -1 } }
		})
		.exec(function(err, foundCloudcanineAd) {
			if (err) {
				console.log(err);
			} else {
				//render show template with that cloudcaninead
				//console.log("cloudcaninead data to be shown ",foundCloudcanineAd);
				res.render('cloudcanineads/show', { cloudcaninead: foundCloudcanineAd });
			}
		});
});

// ===================================
// Edit existing posts in Cloud Canine
// ===================================

// EDIT CAMPGROUND ROUTE
router.get('/:id/edit', middleware.checkAdOwnership, function(req, res) {
	CloudCaninead.findById(req.params.id, function(err, foundCloudcanineAd) {
		res.render('cloudcanineads/edit', { cloudcaninead: foundCloudcanineAd });
	});
});

router.get('/:id/edit', middleware.checkAdOwnership, function(req, res) {
	CloudCaninead.findById(req.params.id, function(err, foundCloudcanineAd) {
		res.render('cloudcanineads/edit', { cloudcaninead: foundCloudcanineAd });
	});
});

router.put('/:id', middleware.checkAdOwnership, upload.array('image', 5), async function(req, res) {
	geocoder.geocode(req.body.cloudcaninead.location, async function(err, data) {
		//Error Handling For Autocomplete API Requests
		if (err || data.status === 'ZERO_RESULTS') {
			req.flash('error', 'Invalid address, try typing a new address');
			return res.redirect('back');
		}

		if (err || data.status === 'REQUEST_DENIED') {
			req.flash('error', 'Something Is Wrong Your Request Was Denied');
			return res.redirect('back');
		}

		if (err || data.status === 'OVER_QUERY_LIMIT') {
			req.flash('error', 'All Requests Used Up');
			return res.redirect('back');
		}

		var lat = data[0].latitude;
		var lng = data[0].longitude;
		var location = data[0].formattedAddress;

		var editPostfn = function(extraInfo) {
			var newData = {
				title: req.body.cloudcaninead.title,
				description: req.body.cloudcaninead.description,
				price: req.body.cloudcaninead.price,
				location: location,
				lat: lat,
				lng: lng
			};
			if (extraInfo.imageUrl) {
				newData['image'] = extraInfo.imageUrl;
			}

			console.log('edit post, data to be updated', newData);

			delete req.body.cloudcaninead.rating;
			//Updated Data Object
			CloudCaninead.findByIdAndUpdate(req.params.id, { $set: newData }, function(err, cloudcaninead) {
				if (err) {
					console.log('edit post, error in saving post data', err);
					req.flash('error', err.message);

					res.redirect('back');
				} else {
					console.log('edit post, successfully updated');
					req.flash('success', 'Successfully Updated!');

					res.redirect('/cloudcanineads/' + cloudcaninead._id);
				}
			});
		};
		let extraInfo = {};
		if (req.files) {
			let uploadUrls = await uploadImagesToCloudnary(req.files);
			extraInfo.imageUrl = uploadUrls;
			editPostfn(extraInfo);
		} else {
			editPostfn(extraInfo);
		}
	});
});

// DESTROY cloudcaninead ROUTE
router.delete('/:id', middleware.checkAdOwnership, function(req, res) {
	CloudCaninead.findById(req.params.id, function(err, cloudcaninead) {
		if (err) {
			res.redirect('/cloudcanineads');
		} else {
			// deletes all questionsforum associated with the cloudcaninead
			questionForum.remove({ _id: { $in: cloudcaninead.questionsforum } }, function(err) {
				if (err) {
					console.log(err);
					return res.redirect('/cloudcanineads');
				}
				// deletes all reviews associated with the cloudcaninead
				Review.remove({ _id: { $in: cloudcaninead.reviews } }, function(err) {
					if (err) {
						console.log(err);
						return res.redirect('/cloudcanineads');
					}
					//  delete the cloudcaninead
					cloudcaninead.remove();
					req.flash('success', 'Listing deleted successfully!');
					res.redirect('/cloudcanineads');
				});
			});
		}
	});
});

/* **************************************************************************************
*    Title: Fuzzy Search 
*  
***************************************************************************************/

router.post('/search', function(req, res) {
	var noMatch = null;
	let reqBody = req.body || {},
		category = reqBody['category'] || '';
	console.log('---', category);

	const regex = new RegExp(escapeRegex(category), 'gi');
	CloudCaninead.find(
		{
			$or: [
				{ name: regex },
				{ location: regex },
				{ category: regex },
				{ subCategory: regex },
				{ description: regex }
			]
		},
		function(err, allCloudcanineAds) {
			let errorMsg = null;
			if (err) {
				console.log(err);
				allCloudcanineAds = [];
				errorMsg = 'please try again';
			}
			res.json({
				cloudcanineads: allCloudcanineAds,
				options: { sort: { createdAt: -1 } },
				noMatch: noMatch,
				errorMsg: errorMsg
			});
		}
	);
});
/**
 * route for handling subscription by user to a cloudcaninead category
 */
// router.post("/subscribe", function(req, res) {
router.post('/subscription', function(req, res) {
	if (!req.isAuthenticated()) {
		let respData = {
			message: 'Please login first to subscribe',
			refCode: 'LOGIN_REQUIRED'
		};
		return res.json({ status: 'failure', error: respData, data: null });
	}
	let userDetails = req.user || {};
	let subCategory = req.body.subCategory;
	console.log('users/subscribe ', userDetails, ' subcat ', subCategory);
	// Find and update the correct user profile
	let catId = CloudcanineadCategoryHelper.getCloudcanineadCategoryId(subCategory);
	let subscriberId = userDetails.id;
	//return  res.json({status:'success',error:null,data:{id:catId,userId:subscriberId}});
	/**
     * find all subscriber list for requested category and update the list
     */
	CategorySubscriber.find({ category_id: catId }, function(err, result) {
		if (err) {
			console.log('userRoute->/users/subscribe,fetching subscriber list failed, reason:' + err);
			let respData = {
				message: 'Please try again, some error occured',
				refCode: 'INTERNAL_SERVER_ERROR'
			};
			return res.json({ status: 'failure', error: respData, data: null });
		} else {
			// console.log("result is here ",JSON.stringify(result))
			let subscribersList = [];
			try {
				result = JSON.parse(JSON.stringify(result));
				subscribersList = (result[0] && result[0].subscribers) || [];
			} catch (err) {
				console.log('userRoute->/users/subscribe :parsing error' + err);
			}
			console.log('current subscribersList ->', subscribersList);
			/**
             * check if user has already subscribed this category
             */
			if (CloudcanineadCategoryHelper.isCategoryAlreadySubscribed(subscriberId, subscribersList)) {
				let respData = {
					message: 'You have already subscribed',
					refCode: 'ALREADY_SUBSCRIBED'
				};
				return res.json({ status: 'failure', error: respData, data: null });
			}
			// else add this user as subscriber
			subscribersList.push(subscriberId);
			console.log('new subscribersList ->', subscribersList);
			CategorySubscriber.updateOne(
				{ category_id: catId },
				{ $set: { subscribers: subscribersList } },
				{ upsert: true },
				function(err, resp) {
					if (err) {
						console.log('userRoute->/users/subscribe, updating subscribers list failedd' + err);
						let respData = {
							message: 'Please try again, some error occured',
							refCode: 'INTERNAL_SERVER_ERROR'
						};
						res.json({ status: 'failure', error: respData, data: null });
					} else {
						console.log(
							'userRoute->/users/subscribe, updating subscribers list succeed for subscriber id ' +
								subscriberId
						);
						let respData = {
							message: 'Subscribed',
							refCode: 'SUBSCRIBED'
						};
						res.json({ status: 'success', error: null, data: respData });
					}
				}
			);
		}
	});
});

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;
