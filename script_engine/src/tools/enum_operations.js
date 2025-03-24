
const { __include__module } = require('./helper');
__include__module('utils.js');
__include__module('runtime.js');
__include__module('parser.js');
__include__module('operations.js');
__include__module('executor.js');
var assert = require('assert');

// Operations の関数を列挙する
var operations = Object.keys(Operations).filter(key => typeof Operations[key] === 'function');
for (let operation of operations) {
    console.log(operation);
}
