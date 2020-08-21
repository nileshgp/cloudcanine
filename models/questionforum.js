var mongoose = require("mongoose");


/* **************************************************************************************
*    Title: Ratings and Review source code
*    Author: Ian Schoonover
*    Date: 2016
*    Code version: 1.0
*    Availability: https://github.com/nax3t/webdevbootcamp/blob/master/YelpCamp/v10/routes/comments.js
*     (Version 1.0) [Source code]. https://github.com/nax3t/webdevbootcamp/blob/master/YelpCamp/v10/routes/comments.js
***************************************************************************************/


var questionForumSchema = mongoose.Schema({
    text: String,
	createdAt: { type: Date, default: Date.now },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});

module.exports = mongoose.model("questionForum", questionForumSchema);