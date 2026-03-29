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
router.post('/check-recovery-options', checkRecoveryOptions);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.post('/verifyemail', verifyEmail);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
