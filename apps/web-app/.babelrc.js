module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      'babel-preset-react-app',
      {
        runtime: 'automatic',
      },
    ],
  ];

  const plugins = [];

  // Only add React Refresh in development
  if (process.env.NODE_ENV === 'development') {
    plugins.push('react-refresh/babel');
  }

  return {
    presets,
    plugins,
  };
};