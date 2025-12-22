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

  it('should emit an error for corrupted rows without a key', (done) => {

    /**
     * * Sample 5:
     * lib/dirty/dirty.js:138:25
     * -         this.emit('error', new Error(`Could not load corrupted row: ${rowStr}`));
     * +         this.emit('', new Error(`Could not load corrupted row: ${rowStr}`));
     */

    const corruptedRow = JSON.stringify({ val: 'value1' }); // Missing "key" triggers corruption
    const data = `${corruptedRow}\n`;

    mockFs({
      [testDir]: {
        'test.db': data,
      },
    });

    const dirty = new Dirty(testFile);

    let errorEmitted = false;
    const timeout = setTimeout(() => done(new Error('Expected error event for corrupted row')), 200);

    dirty.on('error', (err) => {
      if (err && err.message.includes(`Could not load corrupted row: ${corruptedRow}`)) {
        errorEmitted = true;
      }
    });

    dirty.on('load', () => {
      clearTimeout(timeout);
      if (errorEmitted) {
        done();
      } else {
        done(new Error('Expected error for corrupted row was not emitted'));
      }
    });
  });

});

