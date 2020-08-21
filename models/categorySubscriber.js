var mongoose = require("mongoose");

var categorySubscriberSchema = mongoose.Schema({
    category_id: {
        type: Number,unique: true
    },
    subscribers: [
        {
    		type: mongoose.Schema.Types.ObjectId,
    		ref: 'User'
    	}
    ]
});

module.exports = mongoose.model("CategorySubscriber", categorySubscriberSchema);