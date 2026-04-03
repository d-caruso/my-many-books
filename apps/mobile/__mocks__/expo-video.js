const React = require('react');

const useVideoPlayer = jest.fn((source, setup) => {
  const player = {
    loop: false,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  if (setup) setup(player);
  return player;
});

const VideoView = ({ testID, accessibilityLabel }) =>
  React.createElement('VideoView', { testID, accessibilityLabel });

module.exports = { useVideoPlayer, VideoView };
