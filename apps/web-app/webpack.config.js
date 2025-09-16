const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { InjectManifest } = require('workbox-webpack-plugin');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`
  
  // Add workbox for PWA
  config.plugins.push(
    new InjectManifest({
      swSrc: './src/sw.ts',
      dontCacheBustURLsMatching: /\.\w{8}\./,
      exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
    })
  );

  return config;
});