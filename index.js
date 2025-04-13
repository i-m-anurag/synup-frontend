const express = require('express');
const path = require('path');
const cors = require('cors');
const archiver = require('archiver');
var bodyParser = require('body-parser')
require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');

const DB_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/prospect';
const DOMAIN = process.env.DOMAIN || 'https://yourdomain.com';
const SITEMAP_DIR = path.join(__dirname, 'sitemaps');
const URL_LIMIT = 50000;



const category = require('./db/category.json');
const business = require('./db/business.json');
const allCategory = require('./db/category_master.json');
const business_data = require('./db/business_data.json');
const DB_DIR = path.join(__dirname, 'db');
const LOCAL_JSON_PATH = path.join(DB_DIR, 'dynamic_business.json');
const BATCH_REF_PATH = path.join(DB_DIR, 'batch_ref.json');

const WEBSITE_DIR = path.join(__dirname, process.env.DIRECTORY);
const axios = require('axios')

const app = express();
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
//     standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
//     legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
//     // store: ... , // Redis, Memcached, etc. See below.
// })

// Apply the rate limiting middleware to all requests.
//app.use(limiter)

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
//Public Folder route

//-----

// Enable CORS
app.use(cors());

function convertData(inputData, mapData) {
    const result = [];

    inputData.forEach(inputObj => {
        const newObj = {};

        for (const key in mapData) {
            const inputDataKeys = mapData[key];
            const values = [];

            inputDataKeys.forEach(inputKey => {
                if (inputKey in inputObj && inputObj[inputKey] !== '') {
                    // If inputKey exists in inputObj and its value is not empty, push its value to values array
                    values.push(inputObj[inputKey]);
                }
            });

            // Assign values array to newObj with key, or assign an empty string if values array is empty
            newObj[key] = values.length === 1 ? values[0] : (values.length > 0 ? values : '');
        }
        let data = {
            ...newObj,
            data: {
                ...inputObj
            }
        }
        result.push(data);
    });

    return result;
}

app.get('/category', (req, res) => {
    res.json(category);
})

app.get('/business', (req, res) => {
    let business_data_filter = allCategory.map(el => {
        return {
            ...el,
            count: business_data.filter(el_business => el.cat_id === parseInt(el_business.category_id)).length
        }
    })

    res.json(business_data_filter.splice(Math.floor(Math.random() * business_data_filter.length), 6));
});

app.get('/allCategory', (req, res) => {
    res.json(allCategory)
});

app.get('/business_data', (req, res) => {
    if (req.query.category_id) {
        let findbusinessData = business_data.filter(el => el.category_id === parseInt(req.query.category_id));
        res.json(findbusinessData)
    }
    else {
        res.json(business_data)
    }
})

app.get('/business_data_dynamic', (req, res) => {
    if (req.query.category_id) {
        let findbusinessData = LOCAL_JSON_PATH.filter(el => el.category_id === parseInt(req.query.category_id));
        res.json(findbusinessData)
    }
    else {
        res.json(JSON.parse(fs.readFileSync(LOCAL_JSON_PATH)))
    }
})


app.get('/batch_info', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(BATCH_REF_PATH)))
})

app.get('/download-sitemaps', async (req, res) => {
    try {
        // Check if sitemap directory exists
        if (!fs.existsSync(SITEMAP_DIR)) {
            return res.status(404).json({ error: 'Sitemaps folder not found' });
        }

        // Set headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=sitemaps.zip');

        const archive = archiver('zip', { zlib: { level: 9 } });

        // Stream archive to response
        archive.pipe(res);

        // Add all files in sitemap directory
        archive.directory(SITEMAP_DIR, false);

        await archive.finalize(); // Important to end stream properly
    } catch (err) {
        console.error('❌ Error zipping sitemap folder:', err.message);
        res.status(500).json({ error: 'Failed to create ZIP archive' });
    }
});
app.get('/latlng', async (req, res) => {
    try {
        if (req.query.address) {
            let googleadress = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.query.address}&key=AIzaSyDmKVesiNSxzSzbb616K6E1dZZa67zRm3s`)
            res.json(googleadress.data)
        }
    }
    catch (e) {
        res.send(400).json({ msg: 'Something went wrong' })
    }

})

app.get('/synup', async (req, res) => {
    try {
        if (req.query.location_id) {
            let locationData = await axios.get(`https://app.synup.com/locations?location_id=${req.query.location_id}`, {
                headers: {
                    'x-api-key': '8KHjv4sZeCafv4YCGnf9F2TKE6MW016Koz7MhUAf'
                }
            })
            console.log('Hii')
            res.json(locationData.data)
        }
    }
    catch (e) {
        res.status(400).json({ msg: 'Something went wrong' })
    }

})

app.post('/standardresponse', (req, res) => {

    if (req.body.inputData && Array.isArray(req.body.inputData) && req.body.mapData && req.headers['x-api-key'] === "Lkx9bvfvfiPWNknptTsD") {
        let data = convertData(req.body.inputData, req.body.mapData)
        res.status(200).json({ data: data })
    }
    else {

        res.status(500).json({ msg: 'bad request' })
    }
});

app.use(express.static(path.join(__dirname, process.env.DIRECTORY)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, process.env.DIRECTORY + '/index.html'));
})


// ===============================
// 📥 1. Ingest Data from S3 Presigned URL
// ===============================
async function fetchAndInsertFromPresignedUrl() {
    try {
        // Read or create batch ref file
        let latestBatchNumber = 100;
        if (fs.existsSync(BATCH_REF_PATH)) {
            const refRaw = fs.readFileSync(BATCH_REF_PATH);
            latestBatchNumber = JSON.parse(refRaw).latestBatchNumber;
        }

        const nextBatch = latestBatchNumber + 1;
        const url = `https://us-east-1-prospect-service.s3.amazonaws.com/data/businesses/batches/batch_${nextBatch}.json`;
        console.log(`🔄 Fetching: ${url}`);

        const res = await axios.get(url);
        const businesses = res.data;

        if (Array.isArray(businesses) && businesses.length > 0) {
            // Load existing data or initialize
            let existingData = [];
            if (fs.existsSync(LOCAL_JSON_PATH)) {
                const raw = fs.readFileSync(LOCAL_JSON_PATH);
                existingData = JSON.parse(raw);
            }

            const currentId = existingData.length > 0 ? existingData[existingData.length - 1].id + 1 : 1;

            // Transform and add entries
            const transformed = businesses.map((biz, index) => ({
                yid: biz.id,
                name: biz.display_name,
                country_iso: biz.country,
                city: biz.city,
                category_id: category.find(el => el.category_name === biz.category) ? category.find(el => el.category_name === biz.category).id : ''
            }));

            existingData.push(...transformed);
            fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(existingData, null, 2));

            // Update local batch reference
            fs.writeFileSync(BATCH_REF_PATH, JSON.stringify({ latestBatchNumber: nextBatch, total_record: existingData.length }, null, 2));

            console.log(`✅ Appended ${transformed.length} businesses to JSON (batch_${nextBatch})`);
        } else {
            console.log('⚠️ No data found in this batch.');
        }
    } catch (err) {
        console.log(err)
        console.error('❌ Error in batch fetch:', err.message);
    }
}

// ===============================
// 🗂️ 2. Generate Sitemap(s)
// ===============================

async function generateSitemaps() {
    try {
        // Load business data from local JSON
        if (!fs.existsSync(LOCAL_JSON_PATH)) {
            console.error('❌ Business JSON file not found.');
            return;
        }

        const rawData = fs.readFileSync(LOCAL_JSON_PATH);
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
            const loc = `${DOMAIN}/business-detail?id=${business.yid}`;
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

        }
        // ✅ Copy all XML files to website folder
        const allFiles = fs.readdirSync(SITEMAP_DIR).filter(f => f.endsWith('.xml'));
        allFiles.forEach(file => {
            fs.copyFileSync(
                path.join(SITEMAP_DIR, file),
                path.join(WEBSITE_DIR, file)
            );
        });

        console.log(`✅ Zipped ${sitemapFiles.length} files`);
        console.log(`✅ sitemap_index.xml created`);
        console.log(`✅ Copied XML files to /website folder`);

        console.log(`✅ Created ${sitemapFiles.length} sitemap file(s)`);
    } catch (err) {
        console.error('❌ Error generating sitemaps:', err.message);
    }
}

//fetchAndInsertFromPresignedUrl()
generateSitemaps()


// ===============================
// ⏱️ CRON JOBS
// ===============================

// Daily at 2 AM
cron.schedule('0 2 * * *', fetchAndInsertFromPresignedUrl);

// Weekly on Sunday at 3 AM
cron.schedule('0 3 * * *', generateSitemaps);

const PORT = process.env.PORT || 8080;
//Server Started
const server = app.listen(
    PORT)
console.log(`Server runing on port ${PORT}`);