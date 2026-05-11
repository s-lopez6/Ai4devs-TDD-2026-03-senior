/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false, isolatedModules: true }],
  },
  roots: ['<rootDir>/src'],
};
