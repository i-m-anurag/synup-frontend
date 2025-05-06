const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    cat_id: { type: Number, required: true },
    name: { type: String },
    image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);