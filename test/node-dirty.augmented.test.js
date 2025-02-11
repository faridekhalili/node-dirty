/**
 * ______________________________________________________________________
 * ______________________________________________________________________   
 * ______________________________________________________________________
 * Sample 3:
 * ConditionalExpression
 * lib/dirty/dirty.js:113:15
 * -             if (err.code === 'ENOENT') {
 * +             if (true) {",
 * ______________________________________________________________________
 * Sample 6:
 * ConditionalExpression
 * lib/dirty/dirty.js:126:17
 * -               if (!rowStr) {
 * +               if (false) {",
 * ______________________________________________________________________
 * Sample 5:
 * StringLiteral
 * lib/dirty/dirty.js:138:25
 * -                 this.emit('error', new Error(`Could not load corrupted row: ${rowStr}`));
 * +                 this.emit(\"\", new Error(`Could not load corrupted row: ${rowStr}`));",
 * ______________________________________________________________________
 * Sample 9:
 * StringLiteral
 * lib/dirty/dirty.js:139:22
 * -                 return '';
 * +                 return \"Stryker was here!\";",
 * ______________________________________________________________________
 * Sample 4:
 * StringLiteral
 * lib/dirty/dirty.js:158:21
 * -             this.emit('read_close');
 * +             this.emit(\"\");",
 * ______________________________________________________________________
 * Sample 1:
 * ConditionalExpression
 * lib/dirty/dirty.js:168:11
 * -         if (!this._queue.size) {
 * +         if (false) {",
 * ______________________________________________________________________
 * Sample 8:
 * EqualityOperator
 * lib/dirty/dirty.js:169:13
 * -           if (this._inFlightWrites <= 0) this.emit('drain');
 * +           if (this._inFlightWrites < 0) this.emit('drain');",
 * ______________________________________________________________________
 */

'use strict';

const config = require('./config');
const assert = require('assert');
const Dirty = require(config.LIB_DIRTY);
const fs = require('fs');


describe('test-forEach', function () {
  let db;

  beforeEach(function () {
    db = new Dirty();
  });

  it('should stop iteration when callback returns false', function () {

    /**
    * * Sample 7:
    * BooleanLiteral
    * lib/dirty/dirty.js:70:28
    * -         if (fn(key, val) === false) break;
    * +         if (fn(key, val) === true) break;",
    */

    db.set('key1', 'value1');
    db.set('key2', 'value2');
    db.set('key3', 'value3');

    let count = 0;
    db.forEach((key, val) => {
      count++;
      return false; // Should stop iteration after first callback
    });

    assert.strictEqual(count, 1);
  });
});

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
    * Sample 2:
    * BlockStatement
    * lib/dirty/dirty.js:87:55
    * -       if (this._queue.size || this._inFlightWrites > 0) {
    * -         this.once('drain', () => this.close());
    * -         return;\n-       }
    * +       if (this._queue.size || this._inFlightWrites > 0) {}",
    * 
    * Sample 10:
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

describe('test-read-stream-error', function () {
  it('should emit an error for non-ENOENT read stream failures', function (done) {
    const fs = require('fs');
    const Dirty = require(config.LIB_DIRTY);
    const forbiddenPath = `${config.TMP_PATH}/not-a-file`;

    // Create a directory instead of a file to trigger EISDIR
    fs.mkdirSync(forbiddenPath, { recursive: true });

    const db = new Dirty(forbiddenPath); // Attempt to open a directory as a file

    db.on('error', (err) => {
      assert.ok(err instanceof Error, 'Error should be an instance of Error');
      assert.notStrictEqual(err.code, 'ENOENT', 'Error should not be ENOENT');
      done();
    });
  });
});







