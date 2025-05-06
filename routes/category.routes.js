const express = require('express');
const { getCategory, seedCategory } = require('../controllers/category.controller');

const router = express.Router();

router.get('/', getCategory);
router.post('/', seedCategory);

module.exports = router;