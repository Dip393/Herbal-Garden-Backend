const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const request = require('request');
// const fetch = require('node-fetch'); // Import node-fetch
// const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const Plant = require('../models/plant');
const User = require('../models/user');
const Review = require('../models/review');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { console } = require('inspector');

// let SummarizerManager = require("node-summarizer").SummarizerManager;

require('dotenv').config();
// const upload = multer({ dest: 'uploads/' });

// Plant.ID API configuration

const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash'
});

//Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// API request to /api/users

//Contact Form
router.post('/contact-form', (req, res) => {
  const { name, email, profession, message } = req.body;
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER, // User's email
      to: process.env.EMAIL_USER, // Admin's email
      subject: `New Message from ${name}`,
      text: `Profession: ${profession}\nMessage: ${message}\nFrom: ${email}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Error sending email' });
      } else {
        return res.status(200).json({ msg: 'Message sent successfully' });
      }
    });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});


// Register Route
router.post('/signup', async (req, res) => {
  const { email } = req.body;
  console.log(email);
  
  try {
    console.log(email);
    // Check if the user already exists and has completed registration
    let user = await User.findOne({ email });

    // If user exists and has completed registration
    if (user && user.userName && user.password) {
      return res.status(200).json({ error: true, msg: 'User already exists' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

    if (user && !user.userName) {
      // User exists with only email and otp, update the OTP
      user.otp = otp;
      await user.save();
    } else {
      // Create new user with just email, userId, and OTP
      user = new User({
        email,
        otp,
      });
      await user.save();
    }

    // Send OTP to email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Error sending OTP' });
      } else {
        res.status(200).json({ msg: 'OTP sent successfully', email });
      }
    });
  } catch (err) {
    res.status(500).send('Server error'); // Do not expose specific error details
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp, userName, password } = req.body;

  try {
    // Find user by email
    let user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(200).json({ error: true, msg: 'OTP has not been sent. Please sign up first.' });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(200).json({ error: true, msg: 'Invalid OTP' });
    }

    const userType = email === process.env.EMAIL_USER ? 'admin' : 'student';

    // Update user details after successful OTP verification
    user.userName = userName;
    user.password = bcrypt.hashSync(password, 10); // Hash password
    user.otp = undefined;  // Remove OTP after verification
    user.userType = userType;

    await user.save();

    res.status(200).json({ msg: 'User registered successfully', isAdmin: email === process.env.EMAIL_USER });
  } catch (err) {
    res.status(500).send('Server error');
  }
});
//Login Route
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;

  try {
    // Find user by email
    let user = await User.findOne({ email });
    if (!user || !user.userName) {
      return res.status(200).json({ error: true, msg: 'User not found' });
    }
    if(!user.userType){
      return res.status(200).json({ error: true, msg: 'Invalid User Type' });
    }
    if(user.userType !== userType){
      return res.status(200).json({ error: true, msg: 'Access denied' });
    }
    // Compare the entered password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(200).json({ error: true, msg: 'Invalid email or password' });
    }

    // OTP handling and JWT generation
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    user.otp = otp;
    await user.save();

    // Send OTP to email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Login OTP Verification',
      text: `Your OTP is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Error sending OTP' });
      } else {
        res.status(200).json({ msg: 'OTP sent successfully', userId: user._id });
      }
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/verify-login-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user by email
    let user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(200).json({ error: true, msg: 'OTP has not been sent. Please try logging in again.' });
    }

    if (user.otp !== otp) {
      return res.status(200).json({ error: true, msg: 'Invalid OTP' });
    }

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_TOKEN, { expiresIn: '168h' });

    user.otp = undefined;
    await user.save();

    res.status(200).json({
      msg: 'Login successful',
      token,
      isAdmin: email === process.env.EMAIL_USER,
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Logout Route
router.post('/logout', async (req, res) => {
  const { email } = req.body;

  try {

    // Find the user by email
    let user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({error:true, msg: 'User not found' });
    }

    // Update loggedInStatus to false
    user.loggedInStatus = false;
    await user.save();

    res.status(200).json({ msg: 'Logout successful' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});
// Forgot Password Route - Step 1: Generate OTP and send to email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // User-specific error, return 400 but not log
      return res.status(400).json({ msg: 'User not found' });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    user.otp = otp;
    await user.save();

    // Send OTP to email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is ${otp}`
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        // Server error when sending email
        return res.status(500).json({ msg: 'Error sending OTP, please try again later.' });
      }
      // Success
      return res.status(200).json({ msg: 'OTP sent successfully', userId: user._id });
    });

  } catch (err) {
    // Server error, log it and return 500 status
    return res.status(500).json({ msg: 'Server error, please try again later.' });
  }
});

// OTP Verification Route - Step 2: Verify OTP and allow password reset
router.post('/verify-forgotp-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp) {
      // User-specific error, return 400 but not log
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    // OTP is valid, allow password reset
    return res.status(200).json({ msg: 'OTP verified successfully' });
  } catch (err) {
    // Server error, log it and return 500 status
    return res.status(500).json({ msg: 'Server error, please try again later.' });
  }
});

// Password Reset Route - Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // User-specific error, return 400 but not log
      return res.status(400).json({ msg: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.otp = undefined; // Clear OTP after password reset
    await user.save();

    // Success
    return res.status(200).json({ msg: 'Password changed successfully' });
  } catch (err) {
    // Server error, log it and return 500 status
    return res.status(500).json({ msg: 'Server error, please try again later.' });
  }
});
// Find the user by email
router.post('/getUserName', async (req, res) => {
  const { email } = req.body; 
    try {
        // Fetch user by email, selecting only the userName field
        const user = await User.findOne({ email: email }, 'userName');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ name: user.userName });
    } catch (error) {
        console.error('Error fetching user by email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// router.post('/verifySecretKey', (req, res) => {
//   const { secretKey } = req.body;

//   // Verify if the secret key matches
//   if (secretKey !== secretKey) {
//     return res.status(400).json({ success: false, message: 'Invalid Secret Key' });
//   }

//   // Generate OTP
//   const otp = otpGenerator.generate(6, { digits: true });
  
//   // Store OTP temporarily, you should store it in DB for production use
//   OTPStore.adminOtp = otp;

//   // Send OTP to Admin's Email (setup email properly)
//   const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//       user: EMAIL_USER,
//       pass: EMAIL_PASS
//     }
//   });

//   const mailOptions = {
//     from: EMAIL_USER,
//     to: EMAIL_USER,  // Replace with actual admin email
//     subject: 'Your Admin OTP',
//     text: `Your OTP is: ${otp}`
//   };

//   transporter.sendMail(mailOptions, (err, info) => {
//     if (err) {
//       return res.status(500).json({ success: false, message: 'Error sending OTP' });
//     }
//     res.status(200).json({ success: true, message: 'OTP sent to email' });
//   });
// });
router.post('/user-type', async (req, res) => {
  const { email } = req.body;
  try {
    let user = await User.findOne({email});
    if (user.userType === 'admin') {
      return res.status(200).json({ userType: 'admin' });
    }
    else if (user.userType === 'student') {
      return res.status(200).json({ userType: 'student' });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});
//Fetch upto 5 random plant details
router.get('/randomPlants', async (req, res) => {
  try {
    // Fetch up to 5 random plants
    const randomPlants = await Plant.aggregate([
      { $sample: { size: 5 } } // MongoDB aggregation pipeline stage to get random documents
    ]);

    res.status(200).json({
      success: true,
      data: randomPlants
    });
  } catch (error) {
    console.error('Error fetching random plants:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching random plants',
    });
  }
});
// Route to get random plants by type
router.get('/random-plants/:type', async (req, res) => {
  try {
    const plantType = req.params.type; // Get plant type from URL params
    const plants = await Plant.aggregate([
      { $match: { type: plantType } }, // Match plants of this type
      { $sample: { size: 10 } }, // Get 10 random plants
      { $project: { 
          commonNames: { $arrayElemAt: ["$commonNames", 0] }, // Get first common name
          botanicalName: 1,
          description: 1,
          images: { $arrayElemAt: ["$images", 0] } // Get first image
      }}
    ]);

    res.json(plants);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
//To search plants
router.post('/search', async (req, res) => {
  try {
    const { query, field } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Tokenize the input query into keywords
    const keywords = query.split(' ').map((word) => new RegExp(word, 'i')); // Case-insensitive regex for each word

    // Define the fields to search
    const searchableFields = {
      all: [
        { commonNames: { $regex: query, $options: 'i' } },
        { botanicalName: { $regex: query, $options: 'i' } },
        { medicinalUses: { $elemMatch: { $regex: query, $options: 'i' } } },
        { cultivationMethods: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { partsUsed: { $regex: query, $options: 'i' } },
        { category: { $elemMatch: { $regex: query, $options: 'i' } } },
        { region: { $elemMatch: { $regex: query, $options: 'i' } } },
        { type: { $elemMatch: { $regex: query, $options: 'i' } } },
        { family: { $regex: query, $options: 'i' } },
      ],
      commonNames: { commonNames: { $regex: query, $options: 'i' } },
      botanicalName: { botanicalName: { $regex: query, $options: 'i' } },
      medicinalUses: { medicinalUses: { $elemMatch: { $regex: query, $options: 'i' } } },
      cultivationMethods: { cultivationMethods: { $regex: query, $options: 'i' } },
      description: { description: { $regex: query, $options: 'i' } },
      partsUsed: { partsUsed: { $regex: query, $options: 'i' } },
      category: { category: { $elemMatch: { $regex: query, $options: 'i' } } },
      region: { region: { $elemMatch: { $regex: query, $options: 'i' } } },
      type: { type: { $elemMatch: { $regex: query, $options: 'i' } } },
      family: { family: { $regex: query, $options: 'i' } },
    };

    // Construct search filter for multiple keywords
    const keywordSearch = keywords.map((regex) => ({
      $or: [
        { commonNames: { $regex: regex } },
        { botanicalName: { $regex: regex } },
        { medicinalUses: { $elemMatch: { $regex: regex } } },
        { cultivationMethods: { $regex: regex } },
        { description: { $regex: regex } },
        { partsUsed: { $regex: regex } },
        { category: { $elemMatch: { $regex: regex } } },
        { region: { $elemMatch: { $regex: regex } } },
        { type: { $elemMatch: { $regex: regex } } },
        { family: { $regex: regex } },
      ],
    }));

    // Apply specific field filtering if not "all"
    const searchFilter =
      field && field !== 'all'
        ? searchableFields[field]
        : { $and: keywordSearch };

    // Query the database
    const results = await Plant.find(searchFilter).lean();

    // Format the results with plantId and matching fields
    const formattedResults = results.map((plant) => {
      const matchingFields = {};
      const regex = new RegExp(query, 'i');

      // Identify the matching fields and include them in the response
      for (const [key, value] of Object.entries(searchableFields)) {
        if (key !== 'all' && Plant.schema.paths[key] && plant[key]) {
          if (Array.isArray(plant[key])) {
            const matches = plant[key].filter((item) => regex.test(item));
            if (matches.length > 0) {
              matchingFields[key] = matches;
            }
          } else if (regex.test(plant[key])) {
            matchingFields[key] = plant[key];
          }
        }
      }

      return {
        images: plant.images,
        plantId: plant._id.toString(),
        commonNames: plant.commonNames,
        matchingFields,
      };
    });

    res.json(formattedResults);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//Get Plant Details
router.get('/plants/:id', async (req, res) => {
  try {
    const plantId = req.params.id;
    const plant = await Plant.findById(plantId).lean();
    if (!plant) {
      return res.status(404).json({ error: 'Plant not found' });
    }
    res.json(plant);
  } catch (error) {
    console.error('Error fetching plant details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To add a plant to the bookmarks
router.post('/add-bookmark', async (req, res) => {
  const { plantId, email } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if the plant is already bookmarked
    if (!user.bookmarks.includes(plantId)) {
      user.bookmarks.push(plantId);
      await user.save();
      return res.status(200).json({ message: 'Bookmark added successfully' });
    } else {
      return res.status(200).json({ message: 'Already bookmarked' });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
//To check if a plant is already bookmarked or not
router.post('/isBookmarked', async (req, res) => {
  const { plantId, email } = req.body; // Ensure the request contains plantId and email
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isBookmarked = user.bookmarks.includes(plantId);
    res.json({ isBookmarked });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To get the bookmarked plants
router.post('/bookmarked-plants', async (req, res) => {
  const { email } = req.body; // Ensure the request contains email
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const bookmarkedPlants = await Plant.find({ _id: { $in: user.bookmarks } }).lean();
    res.json(bookmarkedPlants);
  }catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To remove a bookmarked plant
router.post('/remove-bookmark', async (req, res) => {
  const { plantId, email } = req.body; // Ensure the request contains plantId and email
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if the plant is already bookmarked
    if (user.bookmarks.includes(plantId)) {
      user.bookmarks = user.bookmarks.filter((id) => id.toString()!== plantId);
      await user.save();
      return res.status(200).json({ message: 'Bookmark removed successfully' });
    } else {
      return res.status(200).json({ message: 'Not bookmarked' });
    }
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
//Viewed Plants
router.post('/viewed-plants', async (req, res) => {
  const { plantId, email } = req.body; // Ensure the request contains email and plantId
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure viewedPlants exists as an array
    if (!user.viewedPlants) {
      user.viewedPlants = [];
    }

    // Add the plant to the array if not already there
    if (!user.viewedPlants.includes(plantId)) {
      user.viewedPlants.push(plantId); // Add the new plant at the end

      // Check if the array exceeds 5 items
      if (user.viewedPlants.length > 5) {
        user.viewedPlants.shift(); // Remove the oldest plant (first item)
      }

      // Save the updated user object
      await user.save();
    }

  } catch (error) {
    console.error('Error updating viewed plants:', error);
    // res.status(500).json({ error: 'Internal server error' });
  }
});
//Fetch last five viewed plant information by user
router.post('/accessViewedPlants', async (req, res) => {
  const { email } = req.body; // Ensure the request contains email
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Fetch the last five viewed plants
    const viewedPlants = await Plant.find({ _id: { $in: user.viewedPlants } }).lean();
    
    res.json(viewedPlants);
  } catch (error) {
    console.error('Error fetching viewed plants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//Add new notes to the user notes
router.post('/add-note', async (req, res) => {
  const { email, note, plantName } = req.body; // Ensure the request contains email and note
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Ensure notes exists as an array
    if (!user.notes) {
      user.notes = [];
    }
    // Create a new note object with a unique ID
    const newNote = {
      plantName: plantName,
      content: note
    };
    // Add the new note at the end
    user.notes.push(newNote);
    // Save the updated user object
    await user.save();
    res.json({ message: 'Note added successfully', note: newNote });
  } catch (err) {
    console.error('Error adding note:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To fetch the notes
router.post('/get-notes', async (req, res) => {
  const { email } = req.body; // Ensure the request contains email
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Fetch the notes
    res.json(user.notes);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To delete a note
router.post('/delete-note', async (req, res) => {
  const { email, noteId } = req.body; // Ensure the request contains email, noteId
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Remove the note with the given id from the notes array
    user.notes = user.notes.filter((note) => note._id.toString()!== noteId);
    // Save the updated user object
    await user.save();
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To edit a note
router.post('/edit-note', async (req, res) => {
  const { email, noteId, updatedContent } = req.body; 
  if (!updatedContent) {
    return res.status(400).json({ error: 'Please provide updated content' });
  }
  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Find the note with the given id
    const note = user.notes.find((note) => note._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    // Update the note content
    note.content = updatedContent;
    // Save the updated user object
    await user.save();
    res.json({ message: 'Note updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To update total views of plant
router.post('/plant-view', async (req, res) => {
  const { plantId } = req.body; // Ensure plantId is provided
  try {

    // Find the plant by plantId
    const plant = await Plant.findOne({ _id: plantId }); // Adjust the query key if necessary
    if (!plant) {
      return res.status(404).json({ error: 'Plant Not Found' }); // Correct status code for not found
    }

    // Increment the view count
    plant.viewed = (plant.viewed || 0) + 1;

    // Save the updated plant document
    await plant.save();

    // Send success response
    res.status(200).json({ message: 'View count updated successfully', viewed: plant.viewed });
  } catch (err) {
    console.error('Error updating plant view count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//To fetch most viewed plant
router.get('/most-viewed-plant', async (req, res) => {
  try {
    // Find the most viewed plant document
    const mostViewedPlant = await Plant.findOne({ viewed: { $gt: 0 } }).sort({ viewed: -1 }).limit(1); // Adjust the query key and sort order if necessary

    if (!mostViewedPlant) {
      return res.status(404).json({ error: 'No most viewed plant found' }); // Correct status code for not found
    }

    // Send success response
    res.json(mostViewedPlant);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
//For chatbot
router.post('/chatbot', async (req, res) => {
  // console.log('Received request:', req.body);
  const input = req.body.prompt;

  try {
    const result = await model.generateContent(input);
    // console.log('Generated result:', result.response.text());
    res.json({ text: result.response.text() });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});
//Fetch Plant Details by AYUSH Category

router.post('/plant-by-ayush-category', async (req, res) => {
  const { ayushCategory, page } = req.body; // Ensure both ayushCategory and page are provided
  const PAGE_SIZE = 10; // Number of plants per page

  try {
    // Find plants by AYUSHType with pagination
    const plants = await Plant.find({ AYUSHType: ayushCategory })
      .skip(page * PAGE_SIZE) // Skip the first (page * PAGE_SIZE) results
      .limit(PAGE_SIZE) // Limit results to PAGE_SIZE
      .exec();

    // Get the total number of plants for this AYUSHType
    const totalPlants = await Plant.countDocuments({ AYUSHType: ayushCategory });

    res.status(200).json({
      plants,
      total: totalPlants, // Total number of plants
    });
  } catch (err) {
    console.error('Error fetching plants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//Review if user is not logged in
router.post('/give-review/not-login', async (req, res) => {
  const { userName, rating, comment } = req.body;

  try {
    // Find or create a document for the specific rating group
    let reviewDoc = await Review.findOne({ rating });
    if (!reviewDoc) {
      reviewDoc = new Review({ rating, reviews: [] });
    }

    // Add the new review to the array
    reviewDoc.reviews.push({ userName, comment });
    await reviewDoc.save();

    res.json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//Review if user is logged in
router.post('/give-review/login', async (req, res) => {
  const { email, userName, rating, comment } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.reviewed) {
      return res.status(400).json({ error: 'User has already reviewed' });
    }

    // Find or create a document for the specific rating group
    let reviewDoc = await Review.findOne({ rating });
    if (!reviewDoc) {
      reviewDoc = new Review({ rating, reviews: [] });
    }

    // Add the new review to the array
    reviewDoc.reviews.push({ userName, comment });
    await reviewDoc.save();

    // Mark the user as reviewed
    user.reviewed = true;
    await user.save();

    res.json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Search endpoint
router.post('/advanced-search', async (req, res) => {
  const { category, region, plantType } = req.body;
  try {
    // Build the search filter dynamically
    const filter = {};
    if (category) filter.category = category;
    if (region) filter.region = region;
    if (plantType) filter.plantType = plantType;

    // Fetch results from database
    const plants = await Plant.find(filter);

    res.json(plants);
  } catch (error) {
    console.error('Error searching plants:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to add a new plant
router.post('/add-plants', async (req, res) => {
  try {
    // Validate request body
    const {
      commonNames,
      botanicalName,
      family,
      medicinalUses,
      composition,
      usageProcedure,
      cultivationMethods,
      description,
      partsUsed,
      images,
      videos,
      model,
      span,
      usageTime,
      category,
      region,
      AYUSHType,
      plantType,
      precautions,
      citations,
      correspondenceLink,
    } = req.body;

    // Ensure required fields are provided
    if (!botanicalName) {
      return res.status(400).json({ error: 'Botanical name is required' });
    }

    // Create a new plant document
    const newPlant = new Plant({
      commonNames,
      botanicalName,
      family,
      medicinalUses,
      composition,
      usageProcedure,
      cultivationMethods,
      description,
      partsUsed,
      images,
      videos,
      model,
      span,
      usageTime,
      category,
      region,
      AYUSHType,
      plantType,
      precautions,
      citations,
      correspondenceLink,
    });

    // Save to database
    const savedPlant = await newPlant.save();
    return res.status(201).json({
      message: 'Plant added successfully!',
      plant: savedPlant,
    });
  } catch (error) {
    console.error('Error adding plant:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//To edit a plant details

// router.put('/edit-plant/:id', async (req, res) => {
//   const { id } = req.params;
//   const updatedPlant = req.body;

//   try {
//     const plant = await Plant.findByIdAndUpdate(id, updatedPlant, { new: true });
//     if (!plant) {
//       return res.status(404).json({ error: 'Plant not found' });
//     }
//     res.json(plant);
//   } catch (error) {
//     console.error('Error updating plant:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
router.put('/plants/:id', async (req, res) => {
  const { id } = req.params;
  const updatedDetails = req.body;

  try {
    const updatedPlant = await Plant.findByIdAndUpdate(id, updatedDetails, {
      new: true, // Return the updated document
    });

    if (!updatedPlant) {
      return res.status(404).json({ message: 'Plant not found.' });
    }

    res.status(200).json(updatedPlant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating plant details.' });
  }
});
module.exports = router