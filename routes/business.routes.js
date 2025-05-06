const express = require('express');
const { createBusinessData, getBusiness } = require('../controllers/business.controller');

const router = express.Router();

router.post('/create', createBusinessData); // POST /api/business/create
router.get('/', getBusiness);

module.exports = router;