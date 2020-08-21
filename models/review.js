var mongoose = require("mongoose");


/* **************************************************************************************
*    Title: Ratings and Review source code
*    Author: Maslaric, Zarco
*    Date: 2018
*    Code version: 2.0
*    Availability: https://github.com/zarkomaslaric/yelpcamp-review-system
*     (Version 2.0) [Source code]. https://github.com/zarkomaslaric/yelpcamp-review-system/blob/master/models/review.js
***************************************************************************************/

var reviewSchema = new mongoose.Schema({
    rating: {
        // Setting the field type
        type: Number,
        // Making the star rating required
        required: "Please provide a rating (1-5 stars).",
        // Defining min and max values
        min: 1,
        max: 5,
        // Adding validation to see if the entry is an integer
        validate: {
            // validator accepts a function definition which it uses for validation
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value."
        }
    },
    // review text
    text: {
        type: String
    },
    // author id and username fields
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    // listing associated with the review
   	cloudcaninead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CloudCaninead"
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);