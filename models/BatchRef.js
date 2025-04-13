const mongoose = require('mongoose');
const batchRefSchema = new mongoose.Schema({ latestBatchNumber: { type: Number, default: 100 } });
module.exports = mongoose.model('BatchRef', batchRefSchema); 