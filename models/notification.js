var mongoose = require('mongoose');

/* **************************************************************************************
*    Title: post notification source code
*    Author: Ian Schoonover
*    Date: 2018
*    Code version: 2.0
*    Adapted from: https://github.com/nax3t/yelpcamp-user-notifications/blob/master/models/notification.js
****/

var notificationSchema = new mongoose.Schema({
	username: String,
	cloudcanineID: String,

	isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);
