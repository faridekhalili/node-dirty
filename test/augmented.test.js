const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const assert = require('assert');


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