const { generateBusinessData } = require('../service/business.service');
const BusinessDetail = require('../models/BusinessDetail');

exports.createBusinessData = async (req, res) => {
    try {
        const data = await generateBusinessData();
        res.status(201).json(data);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Failed to create business data' });
    }
};

exports.getBusiness = async (req, res) => {
    try {
        const data = await BusinessDetail.find(req.query);
        res.status(200).json(data);
    } catch (err) {
        // console.error('API Error:', err);
        res.status(500).json({ error: 'No Business Data Exists' });
    }
};