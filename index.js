const express = require('express');
const path = require('path');
const cors = require('cors');
var bodyParser = require('body-parser')
require('dotenv').config();
const category = require('./db/category.json');
const business = require('./db/business.json');
const allCategory = require('./db/category_master.json');
const business_data = require('./db/business_data.json');
const axios = require('axios')

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
//Public Folder route

//-----

// Enable CORS
app.use(cors());

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

app.use(express.static(path.join(__dirname, process.env.DIRECTORY)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, process.env.DIRECTORY + '/index.html'));
})

const PORT = process.env.PORT || 8080;
//Server Started
const server = app.listen(
    PORT)
console.log(`Server runing on port ${PORT}`);