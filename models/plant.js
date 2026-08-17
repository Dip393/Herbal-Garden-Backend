const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const plantSchema = new Schema({
  commonNames: {type:[String], default:[]}, // Array of other common names
  botanicalName: { type: String, required: true }, // Botanical/scientific name
  family: { type: String, trim: true }, // Family of plant
  medicinalUses: {type:[String], default: []}, // List of medicinal uses(first medicinal uses of parts & then whole plant)
  composition: {type:[String], default:[]}, //Chemical composition
  usageProcedure: [{type:[String], trim:true}], //How to use
  cultivationMethods: { type: String, trim: true}, // Details on how to grow/cultivate which include watering amount,temperature,climates,rainfall,soil type,wind,sunlight amount
  description: { type: String, trim: true}, // Comprehensive plant description
  partsUsed: [{ type: String, trim:true}], // List of parts used
  images: {type:[String], default:[]}, // URLs of high-quality images
  videos: {type:[String], default:[]}, // URLs of relevant videos
  model: {type:[String], trim:true}, // URL of the 3D model
  span:{type: String}, //Seasonal or yearly plant
  usageTime:[{type: String}],//Can be used in which seasons like summer, winter, autumn, rainy, spring, etc
  // Categories such as digestive health, immunity, Skin Care, Respiratory Health, Pain Relief
  // Stress and Anxiety Relief, Anti-Inflammatory, Cardiovascular Health, Detoxification, Antimicrobial
  // Hormonal Balance, Sleep Aid, Energy Booster, Memory and Cognitive Support, Blood Sugar Regulation, Bone and Joint Health, etc.
  category: {type:[String], default:[]}, //Medicinal Uses Category
  region: {type:[String], default:[]}, // Regions where the plant is commonly found
  AYUSHType: {type:[String], default:[]}, // Type of plant (Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy)
  plantType: { type: String, trim:true }, // Family of plants (e.g., herb, shrub, tree) 
  precautions: { type: String, trim:true }, //Safety information
  virtualTourThemes: [String], // Themes for virtual tours involving this plant
  citations:[{type: String, trim:true}],
  viewed: {type:Number, default:0}, //Viewed Plant
  correspondenceLink: { type: String, trim:true }, //Source of information
  audio: {type: String, trim:true}
});

module.exports = mongoose.model('Plant', plantSchema);
