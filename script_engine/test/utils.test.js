
const { __include__module } = require('./test_helper');
__include__module('utils.js');
var assert = require('assert');

// tail
describe('Array', function() {
    it('tail(0) は 3 を返す', function() {
        assert.equal([1, 2, 3].tail(0), 3);
    });
    it('tail(1) は 2 を返す', function() {
        assert.equal([1, 2, 3].tail(1), 2);
    });
});

// drop
describe('Array', function() {
    it('drop(1) は [1, 2] を返す', function() {
        var arr = [1, 2, 3];
        arr.drop(1);
        assert.deepEqual(arr, [1, 2]);
    });
    it('drop(2) は [1] を返す', function() {
        var arr = [1, 2, 3];
        arr.drop(2);
        assert.deepEqual(arr, [1]);
    });
});

// isNumeric
describe('isNumeric', function() {
    it('isNumeric("123") は true を返す', function() {
        assert.equal(isNumeric("123"), true);
    });
    it('isNumeric("1.234") は true を返す', function() {
        assert.equal(isNumeric("1.234"), true);
    });
    it('isNumeric("1e+10") は true を返す', function() {
        assert.equal(isNumeric("1e+10"), true);
    });
    it('isNumeric("abc") は false を返す', function() {
        assert.equal(isNumeric("abc"), false);
    });
});

// isIdentity
describe('isIdentity', function() {
    it('isIdentity("abc") は true を返す', function() {
        assert.equal(isIdentity("abc"), true);
    });
    it('isIdentity("123") は false を返す', function() {
        assert.equal(isIdentity("123"), false);
    });
    it('isIdentity("_abc") は true を返す', function() {
        assert.equal(isIdentity("_abc"), true);
    });
    it('isIdentity("1abc") は false を返す', function() {
        assert.equal(isIdentity("1abc"), false);
    });
    it('isIdentity("1ABC") は false を返す', function() {
        assert.equal(isIdentity("1ABC"), false);
    });
    it('isIdentity("ABC1") は true を返す', function() {
        assert.equal(isIdentity("ABC1"), true);
    });
});

// Enum
describe('Enum', function() {
    it('Enum(1) は 1 を返す', function() {
        assert.equal(Enum(1), 1);
    });
    it('Enum() は 2 を返す', function() {
        assert.equal(Enum(), 2);
    });
    it('Enum() は 3 を返す', function() {
        assert.equal(Enum(), 3);
    });
});
