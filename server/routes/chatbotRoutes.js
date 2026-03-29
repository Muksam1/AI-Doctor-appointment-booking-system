const express = require('express');
const { processChatbotMessage } = require('../controllers/chatbotController');

const router = express.Router();

router.post('/', processChatbotMessage);

module.exports = router;
