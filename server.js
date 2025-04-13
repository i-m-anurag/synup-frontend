require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const Business = require('./models/Business');
const BatchRef = require('./models/BatchRef');

const DB_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/prospect';
const DOMAIN = process.env.DOMAIN || 'https://yourdomain.com';
const SITEMAP_DIR = path.join(__dirname, 'sitemaps');
const URL_LIMIT = 50000;

mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// ===============================
// 📥 1. Ingest Data from S3 Presigned URL
// ===============================
async function fetchAndInsertFromPresignedUrl() {
    try {
        let ref = await BatchRef.findOne();
        if (!ref) ref = await BatchRef.create({ latestBatchNumber: 100 });

        const nextBatch = ref.latestBatchNumber + 1;
        const url = `https://us-east-1-prospect-service.s3.amazonaws.com/data/businesses/batches/batch_${nextBatch}.json`;
        console.log(`🔄 Fetching: ${url}`);

        const res = await axios.get(url);
        const businesses = res.data;

        if (Array.isArray(businesses) && businesses.length > 0) {
            await Business.insertMany(businesses, { ordered: false });
            ref.latestBatchNumber = nextBatch;
            await ref.save();
            console.log(`✅ Inserted batch_${nextBatch}.json (${businesses.length} records)`);
        } else {
            console.log('⚠️ No data found in this batch.');
        }
    } catch (err) {
        console.error('❌ Error in batch fetch:', err.message);
    }
}

// ===============================
// 🗂️ 2. Generate Sitemap(s)
// ===============================

async function generateSitemaps() {
    try {
        // Load business data from local JSON
        if (!fs.existsSync(JSON_FILE_PATH)) {
            console.error('❌ Business JSON file not found.');
            return;
        }

        const rawData = fs.readFileSync(JSON_FILE_PATH);
        const businesses = JSON.parse(rawData);

        // 🔥 Clean up sitemap directory before regenerating
        if (fs.existsSync(SITEMAP_DIR)) {
            const files = fs.readdirSync(SITEMAP_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(SITEMAP_DIR, file));
            }
        } else {
            fs.mkdirSync(SITEMAP_DIR);
        }

        let urls = '';
        let fileIndex = 1;
        let count = 0;
        let sitemapFiles = [];

        for (const business of businesses) {
            const loc = `${DOMAIN}/business/${business.id}`;
            urls += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
`;
            count++;

            if (count % URL_LIMIT === 0) {
                const filename = `sitemap${fileIndex}.xml`;
                const filePath = path.join(SITEMAP_DIR, filename);
                const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
                fs.writeFileSync(filePath, sitemapXml);
                sitemapFiles.push(filename);
                fileIndex++;
                urls = '';
            }
        }

        // Write remaining entries
        if (urls.trim().length > 0) {
            const filename = fileIndex === 1 ? 'sitemap.xml' : `sitemap${fileIndex}.xml`;
            const filePath = path.join(SITEMAP_DIR, filename);
            const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
            fs.writeFileSync(filePath, sitemapXml);
            sitemapFiles.push(filename);
        }

        // Generate sitemap index
        if (sitemapFiles.length > 1) {
            const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(file => `
  <sitemap>
    <loc>${DOMAIN}/sitemaps/${file}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
            fs.writeFileSync(path.join(SITEMAP_DIR, 'sitemap_index.xml'), indexXml);
            console.log(`🗂️ Created sitemap_index.xml`);
        }

        console.log(`✅ Created ${sitemapFiles.length} sitemap file(s)`);
    } catch (err) {
        console.error('❌ Error generating sitemaps:', err.message);
    }
}

// ===============================
// ⏱️ CRON JOBS
// ===============================

// Daily at 2 AM
// cron.schedule('0 2 * * *', fetchAndInsertFromPresignedUrl);

// Weekly on Sunday at 3 AM
// cron.schedule('0 3 * * 0', generateSitemaps);

// For testing manually
// fetchAndInsertFromPresignedUrl();
generateSitemaps();