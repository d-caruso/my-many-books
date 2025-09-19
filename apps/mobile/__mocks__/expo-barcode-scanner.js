export const BarCodeScanner = {
  requestPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
    granted: true,
  })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
    granted: true,
  })),
};