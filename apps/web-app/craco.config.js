const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    plugins: {
      add: [
        new InjectManifest({
          swSrc: './src/sw.ts',
          dontCacheBustURLsMatching: /\.\w{8}\./,
          exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        }),
      ],
    },
  },
}