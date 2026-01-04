const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const mockFs = require('mock-fs');
const path = require('path');
const assert = require('assert');

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


  it('should emit error event with message "Empty lines never appear in a healthy database" when an empty line is encountered', done => {
      
    /**
      * Mutation sample 6:
      * ConditionalExpression
      * lib/dirty/dirty.js:126:17
      * -               if (!rowStr) {
      * +               if (false) {",  
    */
      
    // Create file content with:
    // 1. A valid row.
    // 2. An empty line.
    // 3. A trailing newline so that the empty line is processed.
    
    const validRow = JSON.stringify({ key: 'key1', val: 'value1' });
    const data = `${validRow}\n\n`;
      
    // Set up the mock file system.
    mockFs({
        [testDir]: {
            'test.db': data
        }
    });
  
    // Create a new Dirty instance. The _load() method is called in the constructor.
    const dirty = new Dirty(testFile);
  
    let emptyLineErrorEmitted = false;
  
    // Listen for error events.
    dirty.on('error', err => {
        if (err && err.message.includes('Empty lines never appear in a healthy database')) {
            emptyLineErrorEmitted = true;
        }
    });
  
    // The load event is always emitted at the end of _load(). We wait for it,
    // then check if the expected error was emitted earlier.
    dirty.on('load', () => {
        if (emptyLineErrorEmitted) {
            done();
        } else {
            done(new Error('Expected error for empty line was not emitted'));
        }
    });
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