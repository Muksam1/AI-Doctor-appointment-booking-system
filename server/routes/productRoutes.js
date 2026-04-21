const express = require('express');
const { getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const productUpload = require('../middleware/productUploadMiddleware');

const router = express.Router();

router.post('/upload-image', protect, admin, productUpload.single('image'), uploadProductImage);

router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct);

router.route('/:id')
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

module.exports = router;
