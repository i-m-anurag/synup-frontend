const express = require('express');
const path = require('path');
const cors = require('cors');
var bodyParser = require('body-parser')
require('dotenv').config();
import { rateLimit } from 'express-rate-limit'
const category = require('./db/category.json');
const business = require('./db/business.json');
const allCategory = require('./db/category_master.json');
const business_data = require('./db/business_data.json');
const axios = require('axios')

const app = express();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

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

const PORT = process.env.PORT || 8080;
//Server Started
const server = app.listen(
    PORT)
console.log(`Server runing on port ${PORT}`);