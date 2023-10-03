const express = require('express');
const path = require('path');
require('dotenv').config()
const app = express();
//Public Folder route

//-----

app.use(express.static(path.join(__dirname, process.env.DIRECTORY)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, process.env.DIRECTORY + '/index.html'));
})

const PORT = process.env.PORT || 8080;
//Server Started
const server = app.listen(
    PORT)
console.log(`Server runing on port ${PORT}`);