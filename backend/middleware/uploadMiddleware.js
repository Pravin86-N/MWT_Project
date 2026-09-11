const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads and customer uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
const customerUploadDir = path.join(__dirname, '..', 'uploads', 'customers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(customerUploadDir)) {
  fs.mkdirSync(customerUploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, customerUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

// File filter (documents and images)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype =
    allowedExtensions.test(file.mimetype) ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        'Only document files (PDF, DOC, DOCX) and image files (JPEG, PNG) are allowed'
      )
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file limit
  fileFilter,
});

// Specific document upload fields for Customer Registration
const uploadCustomerDocuments = upload.fields([
  { name: 'panDocument', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'companyRegistrationCertificate', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'additionalSupportingDocuments', maxCount: 5 },
]);

module.exports = upload;
module.exports.uploadCustomerDocuments = uploadCustomerDocuments;
