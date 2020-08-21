const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const cloudcanineDBSchema = new mongoose.Schema({
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		username: String
	},
	image: [ { type: String, default: '/public/images/4.jpg' } ],
	title: String,
	description: String,
	location: String,
	lat: Number,
	lng: Number,
	createdAt: { type: Date, default: Date.now },
	questionsforum: [ { type: mongoose.Schema.Types.ObjectId, ref: 'questionForum' } ],
	/**
    * reviews ObjectId references array and rating which will hold the average rating 
    * for the selected cloudcaninead, based on all user reviews.
    * 
    */
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Review'
		}
	],
	rating: {
		type: Number,
		default: 0
	},
	category: String,
	subCategory: String,

	/** specific fields for the dog category */
	price: String,
	sex: String,
	mileage: String,
	transmission: String,
	colour: String,
	birthdate: Date
});

cloudcanineDBSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('CloudCaninead', cloudcanineDBSchema);
