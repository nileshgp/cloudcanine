const modelConfig = require('../models/config'),
	CategorySubscriber = require('../models/categorySubscriber'),
	UserModel = require('../models/user');
nodemailer = require('nodemailer');
(bluebirdPromise = require('bluebird')),
	(async = require('async')),
	(emailNotifConfig = require('../helpers/configHelper').emailConfig);

module.exports = {
	/**
     * 
     * @param {*} category like events, dogs, services
     * * @param {*} productData contains the information about product or cloudcaninead
     */
	sendEmailToSubscribers: async function(category, productData, metaData) {
		console.log('notificationHelper->sendEmailToSubscribers, start request category', category);
		categoryInfo = modelConfig['CategoryMapping'] && modelConfig['CategoryMapping'][category];
		let catId = categoryInfo && categoryInfo['id'];
		console.log('notificationHelper->sendEmailToSubscribers, categoryInfo', categoryInfo);
		if (!catId) return;
		// sending email to subscribers;
		var _this = this;
		CategorySubscriber.find({ category_id: catId }, function(err, result) {
			if (err) {
				console.log('notificationHelper->sendEmailToSubscribers ,no notifications to be sent, reason:' + err);
			} else {
				// console.log("result is here ",JSON.stringify(result))
				let resp = [],
					subscribers = [];
				try {
					resp = JSON.parse(JSON.stringify(result));
					subscribers = (resp[0] && resp[0].subscribers) || [];
				} catch (err) {
					console.log('notificationHelper->sendEmailToSubscribers : some parsing error' + err);
				}
				_this.sendNotifications(subscribers, productData, metaData);
			}
		});
	},
	/**
     * sends email notification to all subscribers
     * @param subscriberIdList
     * @param productData
     * @param metaData
     */
	sendNotifications: function(subscriberIdList, productData, metaData) {
		this.getEmailPromises(subscriberIdList, productData, metaData)
			.then((emailPromises) => {
				if (!emailPromises.length) {
					// send all notifications parallel
					bluebirdPromise
						.settle(emailPromises)
						.then(function(results) {
							results.forEach((res, index) => {
								if (res.isFulfilled()) {
									console.log('notificationHelper->sendNotifications,success ' + res._settledValue);
								} else {
									console.log(
										'notificationHelper->sendNotifications,failure ',
										res.id,
										' error : ',
										res._settledValue
									);
								}
							});
						})
						.catch(function(err) {
							console.log('notificationHelper->sendNotifications : catch block error ' + err);
						});
				}
			})
			.catch((err) => {
				console.log('notificationHelper->sendNotifications , error in parent cactch' + err);
			});
	},
	/**
     * gets all email promises
     * @param subscriberIds
     * @param productData
     * @param metaData
     * @returns {Promise<unknown>}
     */
	getEmailPromises: function(subscriberIds, productData, metaData) {
		// start parent promise
		let _this = this;
		return new Promise(function(resolve, reject) {
			let emailPromises = [];
			/**
         * get all subscriber details from db
         */
			_this
				.getSubscriberDetails(subscriberIds)
				.then((emailList) => {
					// create all email promises for all subscribers
					console.log('notificationHelper->getEmailPromises, subscriber email list ' + emailList);
					var transporter = nodemailer.createTransport({
						host: emailNotifConfig.host,
						port: emailNotifConfig.port,
						auth: {
							user: emailNotifConfig.appEmail,
							pass: process.env.GMAILPW
						}
					});
					//emailList = ['nileshgpatel@outlook.com'];
					for (let ind = 0; ind < emailList.length; ind++) {
						let mailOptions = {
							from: emailNotifConfig.appEmail,
							to: emailList[ind],
							subject: emailNotifConfig.subject,
							text:
								'You are receiving this email because someone has posted cloudcaninead product of your interest recently.\n\n' +
								'Please click on the following link, or paste this into your browser:\n\n' +
								'http://' +
								metaData.host +
								'/cloudcanineads/' +
								productData.cloudcanineID +
								'\n\n'
						};
						let singleEmailPromise = new Promise(function(resolve, reject) {
							transporter.sendMail(mailOptions, function(error, info) {
								if (error) {
									console.log(
										'notificationHelper->getEmailPromises , error in sending email for ' +
											emailList[ind]
									);
									reject({ resp: 'failure', error: error });
								} else {
									//console.log('Email sent: ' + info.response);
									resolve({ resp: 'success', data: info.response });
								}
							});
						});
						emailPromises.push(singleEmailPromise);
					}
					resolve(emailPromises);
				})
				.catch((err) => {
					console.log('notificationHelper->getEmailPromises,error in getting subscriber details' + err);
					resolve(emailPromises);
				});
		}); // end parent promise
	},
	/**
     * get all subscriber email details
     * @param userIds
     * @returns {Promise<unknown>}
     */
	getSubscriberDetails: function(userIds) {
		let subscriberEmails = [];
		// get all user's email
		return new Promise(function(resolve, reject) {
			UserModel.find({ _id: { $in: userIds } }, { email: 1 }, function(err, result) {
				if (err) {
					console.log('notificationHelper->getSubscriberDetails, user data fetching error' + err);
					resolve(subscriberEmails);
				} else {
					// have to ensure to send emails, ids
					try {
						let resultArray = JSON.parse(JSON.stringify(result));
						resultArray.forEach(function(element) {
							if (element.email) subscriberEmails.push(element.email);
						});
					} catch (err) {
						console.log('notificationHelper->getSubscriberDetails, JSON parsing error' + err);
					}
					resolve(subscriberEmails);
				}
			});
		});
	}
};
