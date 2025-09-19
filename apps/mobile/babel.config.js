module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/types': './src/types',
            '@/utils': './src/utils',
            '@/navigation': './src/navigation',
            '@/contexts': './src/contexts'
          }
        }
      ]
    ]
  };
};