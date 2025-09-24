#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'https://79rombgo29.execute-api.us-east-1.amazonaws.com/dev';

const categories = [
  'Fiction',
  'Classic Literature', 
  'Dystopian Fiction',
  'Romance',
  'Adventure',
  'Magical Realism',
  'Modernist Literature',
  'Existential Fiction',
  'War Fiction',
  'Contemporary Fiction',
  'Science Fiction',
  'Mystery',
  'Historical Fiction',
  'Biography',
  'Non-Fiction'
];

async function seedCategories() {
  console.log('Starting to seed categories...');
  
  for (const categoryName of categories) {
    try {
      console.log(`Creating category: ${categoryName}`);
      
      const response = await axios.post(`${API_BASE_URL}/categories`, {
        name: categoryName
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Created: ${categoryName}`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️  Already exists: ${categoryName}`);
      } else {
        console.error(`❌ Failed to create ${categoryName}:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log('\n✨ Category seeding completed!');
}

seedCategories().catch(console.error);