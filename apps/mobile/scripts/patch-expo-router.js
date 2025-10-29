#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  'node_modules/expo-router/_ctx.js',
  'node_modules/expo-router/_ctx.android.js',
  'node_modules/expo-router/_ctx.ios.js',
  'node_modules/expo-router/_ctx.web.js',
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/process\.env\.EXPO_ROUTER_APP_ROOT/g, '"./app"');
    content = content.replace(/process\.env\.EXPO_ROUTER_IMPORT_MODE/g, '"sync"');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
});

console.log('Expo Router patching complete!');
