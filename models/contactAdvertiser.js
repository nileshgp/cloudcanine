var mongoose = require("mongoose");

var contactAdvertiserSchema = mongoose.Schema({
    name: String,
    message: String

});

module.exports = mongoose.model("contactAdvertiser", contactAdvertiserSchema );