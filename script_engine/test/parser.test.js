const { __include__module } = require('./test_helper');
__include__module('utils.js');
__include__module('runtime.js');
__include__module('operations.js');
__include__module('parser.js');
var assert = require('assert');

// createJumpLabel
describe('ParseContext', function() {
    it('ParseContext.createJumpLabel("label_") は label_0', function() {
        var ctx = new ParseContext();
        assert.equal(ctx.createJumpLabel("label_"), "label_0");
    });
    it('3回目の ParseContext.createJumpLabel は label_2', function() {
        var ctx = new ParseContext();
        ctx.createJumpLabel("");
        ctx.createJumpLabel("")
        assert.equal(ctx.createJumpLabel("label_"), "label_2");
    });
});

// createParseToken
describe('createParseToken', function() {
    it('createParseToken("1", false) は ParseToken(1, ParseTokenTypes.INTEGER)', function() {
        assert.deepEqual(createParseToken("1", false), new ParseToken(1, ParseTokenTypes.INTEGER));
    });
    it('createParseToken("1.0", false) は ParseToken(1.0, ParseTokenTypes.FLOAT)', function() {
        assert.deepEqual(createParseToken("1.0", false), new ParseToken(1.0, ParseTokenTypes.FLOAT));
    });
    it('createParseToken("1.0", true) は ParseToken("1.0", ParseTokenTypes.STRING)', function() {
        assert.deepEqual(createParseToken("1.0", true), new ParseToken("1.0", ParseTokenTypes.STRING));
    });
    it('createParseToken("abc", false) は ParseToken("abc", ParseTokenTypes.IDENTITY)', function() {
        assert.deepEqual(createParseToken("abc", false), new ParseToken("abc", ParseTokenTypes.IDENTITY));
    });
});

// splitTokens
describe('splitTokens', function() {
    it('splitTokens("a b c") は [ParseToken("a", ParseTokenTypes.IDENTITY), ParseToken("b", ParseTokenTypes.IDENTITY), ParseToken("c", ParseTokenTypes.IDENTITY)]', function() {
        assert.deepEqual(splitTokens("a b c"), [new ParseToken("a", ParseTokenTypes.IDENTITY), new ParseToken("b", ParseTokenTypes.IDENTITY), new ParseToken("c", ParseTokenTypes.IDENTITY)]);
    });
    it('splitTokens("a \"b c\" d") は [ParseToken("a", ParseTokenTypes.IDENTITY), ParseToken("b c", ParseTokenTypes.STRING), ParseToken("d", ParseTokenTypes.IDENTITY)]', function() {
        assert.deepEqual(splitTokens("a \"b c\" d"), [new ParseToken("a", ParseTokenTypes.IDENTITY), new ParseToken("b c", ParseTokenTypes.STRING), new ParseToken("d", ParseTokenTypes.IDENTITY)]);
    });
    it('splitTokens("a \"b c d") は エラー', function() {
        assert.throws(() => splitTokens("a \"b c d"), Error);
    });
    it('splitTokens("PRINT \"HELLO\"; あいさつ") は [IDENTITY, STRING]', function() {
        assert.deepEqual(splitTokens("PRINT \"HELLO\"; あいさつ"), [new ParseToken("PRINT", ParseTokenTypes.IDENTITY), new ParseToken("HELLO", ParseTokenTypes.STRING)]);
    });
    it('splitTokens("PRINT \"HE;L;LO\"; あいさつ") は [IDENTITY, STRING], クォーテーション内の ; はコメント扱いにならない', function() {
        assert.deepEqual(splitTokens("PRINT \"HELLO\"; あいさつ"), [new ParseToken("PRINT", ParseTokenTypes.IDENTITY), new ParseToken("HELLO", ParseTokenTypes.STRING)]);
    });
});

// sourceToTokensList
describe('sourceToTokensList', function() {
    // pattern1
    var code = [
        'MAIN',
        'PRINT "HELLO"; コメント',
        'END_MAIN'
    ].join("\n");
    var tokens_list = sourceToTokensList(code);
    it('sourceToTokensList は [IDENTITY, STRING] ... ', function() {
        assert.deepEqual(tokens_list[0], [new ParseToken("MAIN", ParseTokenTypes.IDENTITY)]);
        assert.deepEqual(tokens_list[1], [new ParseToken("PRINT", ParseTokenTypes.IDENTITY), new ParseToken("HELLO", ParseTokenTypes.STRING)]);
        assert.deepEqual(tokens_list[2], [new ParseToken("END_MAIN", ParseTokenTypes.IDENTITY)]);
    });

    // pattern2
    var code = [
        'DATA a 1 9.9 "STR"',
    ].join("\n");
    var tokensList = sourceToTokensList(code);
    it('TokenTypes チェック', function() {
        assert.equal(tokensList[0][0].type, ParseTokenTypes.IDENTITY);
        assert.equal(tokensList[0][1].type, ParseTokenTypes.IDENTITY);
        assert.equal(tokensList[0][2].type, ParseTokenTypes.INTEGER);
        assert.equal(tokensList[0][3].type, ParseTokenTypes.FLOAT);
        assert.equal(tokensList[0][4].type, ParseTokenTypes.STRING);
    });
});

