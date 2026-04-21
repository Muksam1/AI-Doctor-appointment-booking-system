const express = require('express');
const {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    verifyEmail,
    checkRecoveryOptions,
    googleLogin
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/google', googleLogin);
router.get('/google/callback', (req, res) => {
    // For now, redirect users back to the frontend login page
    // This allows the browser to return to your app after Google authentication
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login`);
});
router.post('/check-recovery-options', checkRecoveryOptions);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.post('/verifyemail', verifyEmail);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
