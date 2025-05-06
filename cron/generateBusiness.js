const cron = require('node-cron');
const { generateBusinessData } = require('../service/business.service');

cron.schedule('0 1 * * *', async () => { // Every day 1 AM
    console.log('[CRON] Running scheduled business data generation...');
    if (process.env.CRON) {
        await generateBusinessData();
    }

});