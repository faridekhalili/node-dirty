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

  it('should emit "read_close" when the read stream closes after load completes', (done) => {

    /**
     * * Sample 4:
     * lib/dirty/dirty.js:158:21
     * -         this.emit('read_close');
     * +         this.emit('');
     */

    const data = `${JSON.stringify({ key: 'key1', val: 'value1' })}\n`;

    mockFs({
      [testDir]: {
        'test.db': data,
      },
    });

    const dirty = new Dirty(testFile);

    let loadEmitted = false;
    let readCloseEmitted = false;
    const timeout = setTimeout(() => done(new Error('Expected read_close event')), 200);

    const finish = () => {
      if (loadEmitted && readCloseEmitted) {
        clearTimeout(timeout);
        done();
      }
    };

    dirty.once('load', () => {
      loadEmitted = true;
      finish();
    });

    dirty.once('read_close', () => {
      readCloseEmitted = true;
      // _readStream should be cleared when the underlying stream closes.
      assert.strictEqual(dirty._readStream, null);
      finish();
    });
  });

});