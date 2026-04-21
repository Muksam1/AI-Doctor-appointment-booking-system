const Product = require('../models/Product');

// @desc    Upload product image
// @route   POST /api/products/upload-image
// @access  Private/Admin
const uploadProductImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const imageUrl = `/uploads/products/${req.file.filename}`;
        res.status(201).json({ imageUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    const { name, price, description, category, countInStock, icon, badge, image } = req.body;

    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'Not authorized as admin' });
        }

        const product = new Product({
            name,
            price,
            description,
            category,
            countInStock,
            icon,
            badge,
            image,
            user: req.user._id
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const firstError = Object.values(error.errors)[0]?.message || 'Invalid product data';
            return res.status(400).json({ message: firstError });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    const { name, price, description, category, countInStock, icon, badge, image } = req.body;

    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'Not authorized as admin' });
        }

        const product = await Product.findById(req.params.id);

        if (product) {
            // Backfill user for legacy products created before user was enforced.
            if (!product.user) product.user = req.user._id;

            if (name !== undefined) product.name = name;
            if (price !== undefined) product.price = price;
            if (description !== undefined) product.description = description;
            if (category !== undefined) product.category = category;
            if (countInStock !== undefined) product.countInStock = countInStock;
            if (icon !== undefined) product.icon = icon;
            if (badge !== undefined) product.badge = badge;
            if (image !== undefined) product.image = image;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        if (error.name === 'ValidationError') {
            const firstError = Object.values(error.errors)[0]?.message || 'Invalid product data';
            return res.status(400).json({ message: firstError });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage
};
