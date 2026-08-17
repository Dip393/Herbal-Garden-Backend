//Node js server
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');//To control cors functionality
const helmet = require('helmet');//Control database information
//const rateLimit = require('express-rate-limit');//To protect from DDOS attacks
const app = express();
require('dotenv').config();

//To limit the niumber of request send to the server
// const limiter = rateLimit({
// 	windowMs: 10 * 60 * 1000, // 10 minutes
// 	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
// 	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
// 	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
// 	// store: ... , // Redis, Memcached, etc. See below.
// })
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
// app.use(limiter);
app.use(bodyParser.json());

//Mongodb Connection Handler
mongoose.connect(process.env.MONGO_URL, {})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('Error connecting to MongoDB:', err));

//Define Routes
app.use('/api/routes', require('./routes/route'));
app.use('/',(req,res) => {
  res.send('Welcome to the API!');
});

//Server start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});