const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const mockFs = require('mock-fs');
const path = require('path');

describe('Dirty - _load method', () => {

  // Define a temporary directory and file path for testing.
  const testDir = path.join(__dirname, 'tempDir');
  const testFile = path.join(testDir, 'test.db');

  afterEach(() => {
    // Restore the real file system after each test.
    mockFs.restore();
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