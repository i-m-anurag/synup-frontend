const mongoose = require('mongoose');

const businessDetailsSchema = new mongoose.Schema({
    yid: String,
    name: String,
    country_iso: String,
    city: String,
    category_id: Number,
    data: Object
}, { timestamps: true });

module.exports = mongoose.model('BusinessDetail', businessDetailsSchema);