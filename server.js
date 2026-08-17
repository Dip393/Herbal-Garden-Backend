// Node js server
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

require('dotenv').config();

const port = process.env.PORT || 3000;


// ==========================================
// CORS CONFIGURATION
// ==========================================

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  })
);


// ==========================================
// HELMET CONFIGURATION
// ==========================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);


// ==========================================
// BODY PARSER
// ==========================================

app.use(bodyParser.json());


// ==========================================
// MONGODB CONNECTION
// ==========================================

mongoose
  .connect(process.env.MONGO_URL, {})
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


// ==========================================
// ROUTES
// ==========================================

app.use('/api/routes', require('./routes/route'));


// ==========================================
// DEFAULT API RESPONSE
// ==========================================

app.use('/', (req, res) => {
  res.send('Welcome to the API!');
});


// ==========================================
// SERVER START
// ==========================================

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});