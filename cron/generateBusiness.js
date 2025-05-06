const cron = require('node-cron');
const { generateBusinessData } = require('../service/business.service');

cron.schedule('0 * * * *', async () => { // Every hour
    console.log('[CRON] Running scheduled business data generation...');
    if (process.env.CRON) {
        await generateBusinessData();
    }

});