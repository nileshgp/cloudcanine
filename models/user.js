var mongoose = require("mongoose");
//  The passport-local-mongoose package automatically takes care of salting and hashing the password.
var passportLocalMongoose = require("passport-local-mongoose");


var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true, 
        required: [true, "can't be blank"],index: true
    },
    password: String,
    avatar: String,
	userDisplay: {
        type: String,
    },
    firstName: String,
    lastName: String,
    email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
    phone: String,
    bio: String,
    userType: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
 	notifications: [
    	{
    	   type: mongoose.Schema.Types.ObjectId,
    	   ref: 'Notification'
    	}
    ],
    followers: [
    	{
    		type: mongoose.Schema.Types.ObjectId,
    		ref: 'User'
    	}
    ]
});


// This will add methods from passport-local-mongoose into userSchema
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);




