

var multer = require("multer");



// ===================================
// Online documentation : https://medium.com/@joeokpus/uploading-images-to-cloudinary-using-multer-and-expressjs-f0b9a4e14c54
// ===================================

// ===================================
// Multer Storage
// ===================================
const storage = multer.diskStorage({ // SET STORAGE
    filename: function(req, file, callback) {
      callback(null, Date.now() + file.originalname);
    }
  });
  // ===================================
  // Multer image filter
  // ===================================
  const imageFilter = function(req, file, callback) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return callback(new Error("Only image files are allowed!"), false);
    }
    callback(null, true);
  };
  // ===================================
  // Storing Image + Filter
  // ===================================
  const upload = multer({ storage: storage, fileFilter: imageFilter });

  module.exports = upload;