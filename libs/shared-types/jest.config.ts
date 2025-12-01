/* eslint-disable */
module.exports = {
  displayName: 'shared-types',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.[tj]s?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/shared-types',
};
