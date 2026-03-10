const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

router.post('/', uploadController.uploadMiddleware, uploadController.uploadImage);

module.exports = router;
