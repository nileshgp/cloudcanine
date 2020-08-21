let modelConfig = require('../models/config');

module.exports = {
	getCloudcanineadCategoryId: function(categoryName) {
		let categoryInfo = modelConfig['CategoryMapping'] && modelConfig['CategoryMapping'][categoryName];
		let catId = categoryInfo && categoryInfo['id'];
		return catId;
	},
	isCategoryAlreadySubscribed: function(subscriberId, subscribersList) {
		return subscribersList.indexOf(subscriberId) >= 0;
	},
	getCurrentCatInfo: function(cloudcaninead) {}
};
