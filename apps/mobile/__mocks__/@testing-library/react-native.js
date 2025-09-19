export const render = jest.fn((component) => ({
  getByText: jest.fn(),
  getByTestId: jest.fn(),
  getByDisplayValue: jest.fn(),
  getByPlaceholderText: jest.fn(),
  queryByText: jest.fn(),
  queryByTestId: jest.fn(),
  queryByDisplayValue: jest.fn(),
  queryByPlaceholderText: jest.fn(),
  findByText: jest.fn(),
  findByTestId: jest.fn(),
  findByDisplayValue: jest.fn(),
  findByPlaceholderText: jest.fn(),
  toJSON: jest.fn(() => component),
  unmount: jest.fn(),
  rerender: jest.fn(),
  debug: jest.fn(),
}));

export const renderHook = jest.fn((hook) => ({
  result: {
    current: hook(),
  },
  rerender: jest.fn(),
  unmount: jest.fn(),
}));

export const fireEvent = {
  press: jest.fn(),
  changeText: jest.fn(),
  scroll: jest.fn(),
};

export const waitFor = jest.fn((callback) => Promise.resolve(callback()));

export const act = jest.fn((callback) => {
  if (typeof callback === 'function') {
    return Promise.resolve(callback());
  }
  return Promise.resolve();
});