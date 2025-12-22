const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const mockFs = require('mock-fs');
const path = require('path');
const assert = require('assert');

describe('Dirty - _load method', () => {

  // Define a temporary directory and file path for testing.
  const testDir = path.join(__dirname, 'tempDir');
  const testFile = path.join(testDir, 'test.db');

  afterEach(() => {
    // Restore the real file system after each test.
    mockFs.restore();
  });

  it('should emit error event for non-ENOENT errors (e.g., EACCES) on _readStream', done => {
   
    /**
     * Mutation sample 3:
     * ConditionalExpression
     * lib/dirty/dirty.js:113:15
     * -             if (err.code === 'ENOENT') {
     * +             if (true) {",
    */
    
    // Set up a mock file system with a file that has no read permissions.
    // Using mode 0o200 (write-only) removes read permission for the owner.
    mockFs({
      [testDir]: {
        'test.db': mockFs.file({
          content: 'dummy data',
          mode: 0o200, // Write-only: reading this file should result in a permission error.
        })
      }
    });

    // Instantiate Dirty with the test file.
    const dirty = new Dirty(testFile);

    // Listen for the 'error' event. We expect an error with code "EACCES".
    dirty.on('error', (err) => {
      try {
        expect(err).toBeDefined();
        expect(err.code).toBe('EACCES');
        done();
      } catch (error) {
        done(error);
      }
    });

    // If a 'load' event is emitted instead, that means our error handling didn't work as intended.
    dirty.on('load', () => {
      done(new Error('Expected error event, but got load event'));
    });
  });

});