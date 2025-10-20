// apps/api/webpack.config.js
const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // KEEP existing context and entry fixes
  config.context = path.join(__dirname, 'src'); 
  config.entry = {
    main: './app.ts',
  };
  
  // FINAL FIX: FORCE SOURCE MAP GENERATION
  // 'source-map' is robust and guarantees an external .js.map file
  config.devtool = 'source-map'; // <-- ADD/CONFIRM THIS LINE
  
  // (Keep the devtoolModuleFilenameTemplate logic from the previous step 
  // if you think it's still needed, but this line is the most critical.)
  if (config.devtool) {
    config.output.devtoolModuleFilenameTemplate = (info) => {
      return `file:///${info.absoluteResourcePath}`;
    };
  }
  
  return config;
});