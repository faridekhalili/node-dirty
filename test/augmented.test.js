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

  it('should emit error for corrupted JSON rows and not return unexpected values from the parser loop', (done) => {

    /**
     * Mutation sample 9:
     * lib/dirty/dirty.js:139:22
     * -             return '';
     * +             return "Stryker was here!";
     */

    const corruptedRow = '{bad json}'; // Invalid JSON triggers the catch branch
    const data = `${corruptedRow}\n`;

    mockFs({
      [testDir]: {
        'test.db': data,
      },
    });

    const originalForEach = Array.prototype.forEach;
    const collectedReturns = [];

    // Capture return values from array forEach callbacks to detect mutation output.
    Array.prototype.forEach = function (cb, thisArg) {
      for (let i = 0; i < this.length; i += 1) {
        collectedReturns.push(cb.call(thisArg, this[i], i, this));
      }
    };

    const dirty = new Dirty(testFile);

    let errorEmitted = false;
    const timeout = setTimeout(() => {
      Array.prototype.forEach = originalForEach;
      done(new Error('Expected error event for corrupted row'));
    }, 200);

    dirty.on('error', (err) => {
      if (err && err.message.includes(`Could not load corrupted row: ${corruptedRow}`)) {
        errorEmitted = true;
      }
    });

    dirty.on('load', () => {
      clearTimeout(timeout);
      Array.prototype.forEach = originalForEach;
      try {
        assert.strictEqual(errorEmitted, true);
        assert.strictEqual(collectedReturns.includes('Stryker was here!'), false);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

});
