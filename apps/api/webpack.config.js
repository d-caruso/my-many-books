// apps/api/webpack.config.js
const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  config.context = path.join(__dirname, 'src');
  config.entry = {
    main: './app.ts',
  };

  config.devtool = 'source-map';

  if (config.devtool) {
    config.output.devtoolModuleFilenameTemplate = (info) => {
      return `file:///${info.absoluteResourcePath}`;
    };
  }

  return config;
});