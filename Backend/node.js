// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios'); // Import Axios to make HTTP requests
const app = express();
const port = 3001;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ashutosh', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// Define schema for JSON data
const jsonDataSchema = new mongoose.Schema({
    ts: Date,
    machine_status: Number,
    vibration: Number
});
const JsonData = mongoose.model('JsonData', jsonDataSchema);

app.use(bodyParser.json());

// API endpoint to get summary statistics
app.get('/summary', async (req, res) => {
    try {
        const jsonData = await JsonData.find();
        // Compute summary statistics
        let numberOfOnes = 0;
        let numberOfZeros = 0;
        let continuousZeros = 0;
        let continuousOnes = 0;
        let prevStatus = null;

        for (const data of jsonData) {
            const status = data.machine_status;

            if (status === 1) {
                numberOfOnes++;
                continuousOnes++;
                continuousZeros = 0;
            } else {
                numberOfZeros++;
                continuousZeros++;
                continuousOnes = 0;
            }

            if (prevStatus !== null && status !== prevStatus) {
                continuousZeros = 0;
                continuousOnes = 0;
            }

            prevStatus = status;
        }

        // Create tabular format for summary statistics
        const summaryTable = [
            { label: 'Number of 1s', value: numberOfOnes },
            { label: 'Number of 0s', value: numberOfZeros },
            { label: 'Continuous 0s', value: continuousZeros },
            { label: 'Continuous 1s', value: continuousOnes }
        ];

        res.json({ summaryTable });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to filter data by time range and frequency
app.get('/filter', async (req, res) => {
    try {
        const { startTime, endTime, frequency } = req.query;
        let filterQuery = { ts: { $gte: new Date(startTime), $lte: new Date(endTime) } };

        // Apply frequency filter
        if (frequency === 'hour') {
            // No additional filtering needed
        } else if (frequency === 'day') {
            filterQuery = {
                ...filterQuery,
                $expr: {
                    $eq: [{ $dayOfYear: '$ts' }, { $dayOfYear: new Date(startTime) }]
                }
            };
        } else if (frequency === 'week') {
            filterQuery = {
                ...filterQuery,
                $expr: {
                    $eq: [{ $week: '$ts' }, { $week: new Date(startTime) }]
                }
            };
        } else if (frequency === 'month') {
            filterQuery = {
                ...filterQuery,
                $expr: {
                    $eq: [{ $month: '$ts' }, { $month: new Date(startTime) }]
                }
            };
        }

        const filteredData = await JsonData.find(filterQuery);
        res.json({ filteredData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to get temperature based on location
app.get('/temperature', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        const response = await axios.get(url);
        const temperature = response.data.main.temp;
        res.json({ temperature });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
