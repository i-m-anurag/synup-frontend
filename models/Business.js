const mongoose = require('mongoose');
const businessSchema = new mongoose.Schema({ id: { type: Number, unique: true }, display_name: String, description: String, phone_number: String, address: String, street: String, city: String, state: String, postal_code: String, country: String, website: String, time_zone: String, rating: String, rating_count: Number, google_cid: String, google_id: String, type: String, category: String, subtypes: String, emails: String, phone_numbers: String });
module.exports = mongoose.model('Business', businessSchema);