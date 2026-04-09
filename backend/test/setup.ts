/**
 * Jest setup file
 * Runs before all tests
 */

// Set test timeout
jest.setTimeout(30000);

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.CONNECTOR_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex for AES-256

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  log: jest.fn(), // Silence console.log
  debug: jest.fn(), // Silence console.debug
  info: jest.fn(), // Silence console.info
  warn: console.warn, // Keep warnings
  error: console.error, // Keep errors
};
