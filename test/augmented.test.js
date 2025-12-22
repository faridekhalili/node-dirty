const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const mockFs = require('mock-fs');
const path = require('path');

describe('Dirty - _load/_drain behavior', () => {
  const testDir = path.join(__dirname, 'tempDir');
  const testFile = path.join(testDir, 'test.db');

  afterEach(() => mockFs.restore());

  it('emits "drain" when the queue is empty and in-flight writes reach 0', (done) => {

    /**
     *  Mutation sample 1:
     * ConditionalExpression
     * lib/dirty/dirty.js:168:11
     * -         if (!this._queue.size) {
     * +         if (false) {",
    ________________________________________________
     * Mutation sample 8:
     * EqualityOperator
     * lib/dirty/dirty.js:169:13
     * -           if (this._inFlightWrites <= 0) this.emit('drain');
     * +           if (this._inFlightWrites < 0) this.emit('drain');",
    */

    mockFs({ [testDir]: { 'test.db': '' } });
    const dirty = new Dirty(testFile);

    dirty.once('load', () => {
      // Force backpressure: write returns false and completes on next tick.
      dirty._writeStream.write = function (data, cb) {
        process.nextTick(cb);
        return false;
      };

      dirty.once('drain', () => done());

      dirty.set('testKey', { test: 'value' });

      // Let the write callback run, then emit the stream drain.
      process.nextTick(() => {
        process.nextTick(() => dirty._writeStream.emit('drain'));
      });
    });
  });
});
