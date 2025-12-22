const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const assert = require('assert');

describe('Dirty - close method', function () {

  let db;

  beforeEach(function () {
    db = new Dirty(null); // No file persistence

    db._readStream = { destroy: () => { db._readStreamDestroyed = true; } };
    db._writeStream = {
      end: (cb) => { db._writeStreamEnded = true; if (cb) cb(); },
      destroy: () => { db._writeStreamDestroyed = true; }
    };
  });

  it('should wait for pending writes before closing', function (done) {

    /**
    * Mutation sample 2:
    * BlockStatement
    * lib/dirty/dirty.js:87:55
    * -       if (this._queue.size || this._inFlightWrites > 0) {
    * -         this.once('drain', () => this.close());
    * -         return;\n-       }
    * +       if (this._queue.size || this._inFlightWrites > 0) {}",
    * ________________________________________________
    * Mutation sample 10:
    * ArrowFunction
    * lib/dirty/dirty.js:92:50
    * -       if (this._writeStream) this._writeStream.end(() => this._writeStream.destroy());
    * +       if (this._writeStream) this._writeStream.end(() => undefined);",  
    */

    db._queue.set('key1', [() => {}]); // Simulate pending write
    db._inFlightWrites = 1; // Simulate an ongoing write

    db.close();

    // Streams should NOT be destroyed immediately
    assert.strictEqual(db._readStreamDestroyed, undefined);
    assert.strictEqual(db._writeStreamDestroyed, undefined);

    // Now simulate the drain event asynchronously
    process.nextTick(() => {
      db._queue.clear();
      db._inFlightWrites = 0;
      db.emit('drain');

      // After drain, streams should be destroyed
      assert.strictEqual(db._readStreamDestroyed, true);
      assert.strictEqual(db._writeStreamEnded, true);
      assert.strictEqual(db._writeStreamDestroyed, true);
      done();
    });

  });

});
