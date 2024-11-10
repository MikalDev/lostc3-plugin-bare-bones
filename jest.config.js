/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.js', '.mjs'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.m?js$': '$1',
  },
  transform: {
    '^.+\\.mjs$': 'babel-jest',
    '^.+\\.(ts|js)x?$': ['ts-jest', {
      useESM: true,
    }],
  },
}; 