const BusinessDetail = require('../models/BusinessDetail');
const BatchRef = require('../models/BatchRef');
const Category = require('../models/Category');
const axios = require('axios')
const generateBusinessData = async () => {
    // const sampleData = {
    //     name: `Business ${Math.floor(Math.random() * 10000)}`,
    //     industry: 'Technology',
    // };

    // const business = new BusinessDetail(sampleData);
    // await business.save();
    // console.log('Business data generated:', business);
    let latestBatchNumber = 100;
    try {
        // Read or create batch ref file
        let insertedData;

        let data = await BatchRef.findOne({}).sort({ _id: -1 });
        let category = await Category.find({});
        console.log(data);
        let nextBatch = latestBatchNumber
        if (data) {
            nextBatch = data.latestBatchNumber + 1;
        }

        const url = `https://us-east-1-prospect-service.s3.amazonaws.com/data/businesses/batches/batch_${nextBatch}.json`;
        console.log(`🔄 Fetching: ${url}`);

        const res = await axios.get(url);
        const businesses = res.data;

        if (Array.isArray(businesses) && businesses.length > 0) {

            // Transform and add entries
            const transformed = businesses.map((biz, index) => ({
                yid: biz.id,
                name: biz.display_name,
                country_iso: biz.country,
                city: biz.city,
                category_id: category.find(el => el.name === biz.category) ? category.find(el => el.name === biz.category).cat_id : '',
                data: {
                    ...biz
                }
                // category_id: category.find(el => el.category_name === biz.category) ? category.find(el => el.category_name === biz.category).id : ''
            }));
            insertedData = await BusinessDetail.insertMany(transformed);
            if (data) {
                let updateBatch = await BatchRef.updateOne({}, { $set: { latestBatchNumber: nextBatch } })
            }
            else {
                let saveBatch = await BatchRef.insertOne({ latestBatchNumber: nextBatch })
            }
            console.log(`✅ Business is Save`);
        } else {
            console.log('⚠️ No data found in this batch.');
        }
    } catch (err) {
        console.log(err)
        console.error('❌ Error in batch fetch:', err.message);
    }
    return latestBatchNumber;
};

module.exports = { generateBusinessData };