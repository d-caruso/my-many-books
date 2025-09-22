const path = require('path');
const { InjectManifest } = require('workbox-webpack-plugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = {
  eslint: {
    enable: process.env.CI !== 'true', // Disable ESLint in CI to prevent warnings from failing build
  },
  babel: {
    loaderOptions: (babelLoaderOptions) => {
      // Force remove react-refresh plugin in ALL environments
      if (babelLoaderOptions.plugins) {
        babelLoaderOptions.plugins = babelLoaderOptions.plugins.filter(plugin => {
          const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
          const isReactRefresh = typeof pluginName === 'string' && 
            (pluginName.includes('react-refresh') || pluginName.includes('ReactRefresh'));
          return !isReactRefresh;
        });
      }
      return babelLoaderOptions;
    },
  },
  style: {
    postcss: {
      plugins: [
        require('tailwindcss')('./tailwind.config.js'),
        require('autoprefixer'),
      ],
    },
  },
  jest: {
    configure: {
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
      testEnvironment: 'jsdom',
      globals: {
        TextEncoder: TextEncoder,
        TextDecoder: TextDecoder,
      },
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Remove ModuleScopePlugin to allow imports from outside src/
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        plugin => !(plugin instanceof ModuleScopePlugin)
      );

      // Disable React Refresh in production
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => !plugin.constructor.name.includes('ReactRefreshWebpackPlugin')
        );
      }

      // Add libs to the include path for babel-loader and ts-loader
      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        const tsRule = oneOfRule.oneOf.find(rule => rule.test && rule.test.toString().includes('tsx?'));
        if (tsRule) {
          // Ensure tsRule.include is an array
          if (!Array.isArray(tsRule.include)) {
            tsRule.include = tsRule.include ? [tsRule.include] : [];
          }
          tsRule.include.push(path.resolve(__dirname, '../../libs'));
        }

        // Remove React Refresh from babel-loader in production
        if (process.env.NODE_ENV === 'production') {
          oneOfRule.oneOf.forEach(rule => {
            if (rule.use && Array.isArray(rule.use)) {
              rule.use.forEach(loader => {
                if (loader.loader && loader.loader.includes('babel-loader')) {
                  if (loader.options && loader.options.plugins) {
                    loader.options.plugins = loader.options.plugins.filter(
                      plugin => !plugin.toString().includes('react-refresh')
                    );
                  }
                }
              });
            }
          });
        }
      }

      // Add path aliases for @my-many-books packages
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@my-many-books/shared-types': path.resolve(__dirname, '../../libs/shared-types/src'),
        '@my-many-books/shared-api': path.resolve(__dirname, '../../libs/shared-api/src'),
        '@my-many-books/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src'),
        '@my-many-books/ui-components': path.resolve(__dirname, '../../libs/ui-components/src'),
        '@my-many-books/shared-hooks': path.resolve(__dirname, '../../libs/shared-hooks/src'),
        '@my-many-books/shared-business': path.resolve(__dirname, '../../libs/shared-business/src'),
        '@my-many-books/shared-design': path.resolve(__dirname, '../../libs/shared-design/src'),
        '@my-many-books/shared-navigation': path.resolve(__dirname, '../../libs/shared-navigation/src'),
        '@my-many-books/shared-forms': path.resolve(__dirname, '../../libs/shared-forms/src'),
      };
      
      return webpackConfig;
    },
    plugins: {
      add: [
        new InjectManifest({
          swSrc: './src/sw.ts',
          dontCacheBustURLsMatching: /\.\w{8}\./,
          exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        }),
      ],
    },
  },
}