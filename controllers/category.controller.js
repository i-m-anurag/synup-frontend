const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');

exports.getCategory = async (req, res) => {
    if (req.query.like) {
        const category = await Category.find({ name: new RegExp('^' + req.query.like, 'i') });
        res.json(category);
    }
    else {
        const category = await Category.find(req.query);
        res.json(category);
    }

};

exports.seedCategory = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../db/category.json');
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        await Category.deleteMany(); // Optional: clear existing data
        const inserted = await Category.insertMany(data);

        res.status(200).json({
            message: 'Seed data inserted successfully',
            insertedCount: inserted.length
        });
    } catch (error) {
        console.error('Seeding error:', error);
        res.status(500).json({ error: 'Failed to seed users' });
    }
};