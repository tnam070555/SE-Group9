// Script cập nhật imageUrl cho tất cả artifacts trong DB
// Chạy 1 lần: node fix-images.js
require('dotenv').config();
const mongoose = require('mongoose');
const Artifact = require('./models/artifact.model');

const IMAGE_MAP = {
  'DDL-01': '/img/palace-front.jpg',
  'DDL-02': '/img/palace-facade.jpg',
  'DDL-03': '/img/palace-side.jpg',
  'DDL-04': '/img/palace-front.jpg',
  'DDL-05': '/img/palace-side.jpg',
  'DDL-06': '/img/palace-facade.jpg',
  'DDL-07': '/img/palace-front.jpg',
  'DDL-08': '/img/palace-side.jpg',
  'DDL-09': '/img/palace-facade.jpg',
  'DDL-10': '/img/palace-front.jpg',
  'DDL-11': '/img/palace-side.jpg',
  'DDL-12': '/img/palace-facade.jpg',
  'DDL-13': '/img/palace-front.jpg',
  'DDL-14': '/img/palace-side.jpg',
  'DDL-15': '/img/palace-facade.jpg',
  'DDL-16': '/img/palace-front.jpg',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const [code, imageUrl] of Object.entries(IMAGE_MAP)) {
    const result = await Artifact.findOneAndUpdate(
      { code },
      { $set: { imageUrl } },
      { new: true }
    );
    console.log(result ? `✓ ${code} → ${imageUrl}` : `✗ ${code}: not found`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
