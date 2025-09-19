export const Camera = {
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
    granted: true,
  })),
  getCameraPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
    granted: true,
  })),
};