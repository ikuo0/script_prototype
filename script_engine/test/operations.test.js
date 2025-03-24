const { __include__module } = require('./test_helper');
__include__module('utils.js');
__include__module('runtime.js');
__include__module('parser.js');
__include__module('operations.js');
var assert = require('assert');

var parseContext = new ParseContext();
parseContext.jumpTable = {"main": 0};

describe('Operations', function() {
    // _get_arg_value
    it('Operations._get_arg_value(1) は 1 を返す', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.equal(Operations._get_arg_value(runtimeCtx, scopeCtx, 1), 1);
    });
    it('Operations._get_arg_value(1.5) は 1.5 を返す', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.equal(Operations._get_arg_value(runtimeCtx, scopeCtx, 1.5), 1.5);
    });
    it('Operations._get_arg_value("1") は例外発生', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._get_arg_value(runtimeCtx, scopeCtx, "1"), Error);
    });
    it('Operations._get_arg_value("1.5") は例外発生', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._get_arg_value(runtimeCtx, scopeCtx, "1.5"), Error);
    });
    it('Operations._get_arg_value("%a") は 1 を返す', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        runtimeCtx.a = 1;
        var scopeCtx = new ScopeContext();
        assert.equal(Operations._get_arg_value(runtimeCtx, scopeCtx, "%a"), 1);
    });
    it('Operations._get_arg_value("@a") は 1 を返す', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        scopeCtx.variable.a = 1;
        assert.equal(Operations._get_arg_value(runtimeCtx, scopeCtx, "@a"), 1);
    });
    it('Operations._get_arg_value("*a") は "a" を返す', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.equal(Operations._get_arg_value(runtimeCtx, scopeCtx, "*a"), "a");
    });
    it('Operations._get_arg_value("a") はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._get_arg_value(runtimeCtx, scopeCtx, "a"), Error);
    });
    it('Operations._get_arg_value({}) はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._get_arg_value(runtimeCtx, scopeCtx, {}), Error);
    });

    // _set_arg_value
    it('Operations._set_arg_value(%W, 1) は runtimeCtx.W = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations._set_arg_value(runtimeCtx, scopeCtx, "%W", 1);
        assert.equal(runtimeCtx.W, 1);
    });
    it('Operations._set_arg_value(@a, 1) は scopeCtx.variable.a = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations._set_arg_value(runtimeCtx, scopeCtx, "@a", 1);
        assert.equal(scopeCtx.variable.a, 1);
    });
    it('Operations._set_arg_value(*a, 1) はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._set_arg_value(runtimeCtx, scopeCtx, "*a", 1), Error);
    });
    it('Operations._set_arg_value(a, 1) はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations._set_arg_value(runtimeCtx, scopeCtx, "a", 1), Error);
    });

    // DATA
    it('Operations.DATA(a, 1) は scopeCtx.variable.a = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations.DATA(runtimeCtx, scopeCtx, ["@a", 1]);
        assert.equal(scopeCtx.variable.a, 1);
    });
    it('Operations.DATA(9, 1) は例外発生', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations.DATA(runtimeCtx, scopeCtx, [9, 1]), Error);
    });

    // MOV
    it('Operations.MOV(%W, 1) は runtimeCtx.W = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations.MOV(runtimeCtx, scopeCtx, ["%W", 1]);
        assert.equal(runtimeCtx.W, 1);
    });
    it('Operations.MOV(@a, 1) は scopeCtx.variable.a = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations.MOV(runtimeCtx, scopeCtx, ["@a", 1]);
        assert.equal(scopeCtx.variable.a, 1);
    });
    it('Operations.MOV(*a, 1) はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations.MOV(runtimeCtx, scopeCtx, ["*a", 1]), Error);
    });
    it('Operations.MOV(a, 1) はエラー', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        assert.throws(() => Operations.MOV(runtimeCtx, scopeCtx, ["a", 1]), Error);
    });

    // PUSH
    it('Operations.PUSH(1) は runtimeCtx.stack = [1]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        Operations.PUSH(runtimeCtx, scopeCtx, [1]);
        assert.deepEqual(runtimeCtx.stack, [1]);
    });
    it('Operations.PUSH(%W) は runtimeCtx.stack = [9]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        runtimeCtx.W = 9;
        var scopeCtx = new ScopeContext();
        Operations.PUSH(runtimeCtx, scopeCtx, ["%W"]);
        assert.deepEqual(runtimeCtx.stack, [9]);
    });
    it('Operations.PUSH(@a) は runtimeCtx.stack = [8]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        scopeCtx.variable.a = 8;
        Operations.PUSH(runtimeCtx, scopeCtx, ["@a"]);
        assert.deepEqual(runtimeCtx.stack, [8]);
    });

    // POP
    it('Operations.POP(%W) は runtimeCtx.W = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1];
        Operations.POP(runtimeCtx, scopeCtx, ["%W"]);
        assert.equal(runtimeCtx.W, 1);
    });
    it('Operations.POP(@a) は scopeCtx.variable.a = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1];
        Operations.POP(runtimeCtx, scopeCtx, ["@a"]);
        assert.equal(scopeCtx.variable.a, 1);
    });

    // PEEK
    it('Operations.PEEK(%W, 0) は runtimeCtx.W = 3', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1, 2, 3];
        Operations.PEEK(runtimeCtx, scopeCtx, ["%W", 0]);
        assert.equal(runtimeCtx.W, 3);
    });
    it('Operations.PEEK(@a, 0) は scopeCtx.variable.a = 3', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1, 2, 3];
        Operations.PEEK(runtimeCtx, scopeCtx, ["@a", 0]);
        assert.equal(scopeCtx.variable.a, 3);
    });
    it('Operations.PEEK(@a, 1) は scopeCtx.variable.a = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1, 2, 3];
        Operations.PEEK(runtimeCtx, scopeCtx, ["@a", 2]);
        assert.equal(scopeCtx.variable.a, 1);
    });

    // POKE
    it('Operations.POKE(0, %W) は runtimeCtx.stack = [1, 1]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.W = 1;
        runtimeCtx.stack = [1, 2];
        Operations.POKE(runtimeCtx, scopeCtx, [0, "%W"]);
        assert.deepEqual(runtimeCtx.stack, [1, 1]);
    });
    it('Operations.POKE(1, @a) は runtimeCtx.stack = [1, 1]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [1, 2];
        scopeCtx.variable.a = 9;
        Operations.POKE(runtimeCtx, scopeCtx, [1, "@a"]);
        assert.deepEqual(runtimeCtx.stack, [9, 2]);
    });

    // LOADLHS
    it('Operations.LOADLHS(%W) は runtimeCtx.LHS = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.W = 1;
        Operations.LOADLHS(runtimeCtx, scopeCtx, ["%W"]);
        assert.equal(runtimeCtx.LHS, 1);
    });
    it('Operations.LOADLHS(@b) は runtimeCtx.LHS = 9', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        scopeCtx.variable.b = 9;
        Operations.LOADLHS(runtimeCtx, scopeCtx, ["@b"]);
        assert.equal(runtimeCtx.LHS, 9);
    });

    // LOADRHS
    it('Operations.LOADRHS(%W) は runtimeCtx.RHS = 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.W = 1;
        Operations.LOADRHS(runtimeCtx, scopeCtx, ["%W"]);
        assert.equal(runtimeCtx.RHS, 1);
    });
    it('Operations.LOADRHS(@b) は runtimeCtx.RHS = 9', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        scopeCtx.variable.b = 9;
        Operations.LOADRHS(runtimeCtx, scopeCtx, ["@b"]);
        assert.equal(runtimeCtx.RHS, 9);
    });

    // LOADLR
    it('Operations.LOADLR(%W, @b) は runtimeCtx.LHS = 1, runtimeCtx.RHS = 9', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.W = 1;
        scopeCtx.variable.b = 9;
        Operations.LOADLR(runtimeCtx, scopeCtx, ["%W", "@b"]);
        assert.equal(runtimeCtx.LHS, 1);
        assert.equal(runtimeCtx.RHS, 9);
    });

    // ADD
    it('Operations.ADD(1, 2) は 3', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.ADD(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 3);
    });

    // SUB
    it('Operations.SUB(1, 2) は -1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.SUB(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, -1);
    });

    // MUL
    it('Operations.MUL(2, 3) は 6', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 3;
        Operations.MUL(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 6);
    });

    // DIV
    it('Operations.DIV(6, 3) は 2', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 6;
        runtimeCtx.RHS = 3;
        Operations.DIV(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 2);
    });

    // EQ
    it('Operations.EQ(1, 1) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 1;
        Operations.EQ(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });
    it('Operations.EQ(1, 2) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.EQ(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });

    // NEQ
    it('Operations.NEQ(1, 1) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 1;
        Operations.NEQ(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });
    it('Operations.NEQ(1, 2) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.NEQ(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });

    // GT
    it('Operations.GT(2, 1) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 1;
        Operations.GT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });
    it('Operations.GT(1, 2) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.GT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });
    it('Operations.GT(2, 2) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 2;
        Operations.GT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });

    // GTE
    it('Operations.GTE(2, 1) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 1;
        Operations.GTE(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });
    it('Operations.GTE(1, 2) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.GTE(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });
    it('Operations.GTE(2, 2) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 2;
        Operations.GTE(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });

    // LT
    it('Operations.LT(1, 2) は 1', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 1;
        runtimeCtx.RHS = 2;
        Operations.LT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 1);
    });
    it('Operations.LT(2, 1) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 1;
        Operations.LT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });
    it('Operations.LT(2, 2) は 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.LHS = 2;
        runtimeCtx.RHS = 2;
        Operations.LT(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.LHS, 0);
    });

    // LTE
    describe('Operations', function() {
        it('Operations.LTE(1, 2) は 1', function() {
            var runtimeCtx = new RuntimeContext(parseContext);
            var scopeCtx = new ScopeContext();
            runtimeCtx.LHS = 1;
            runtimeCtx.RHS = 2;
            Operations.LTE(runtimeCtx, scopeCtx, []);
            assert.equal(runtimeCtx.LHS, 1);
        });
        it('Operations.LTE(2, 1) は 0', function() {
            var runtimeCtx = new RuntimeContext(parseContext);
            var scopeCtx = new ScopeContext();
            runtimeCtx.LHS = 2;
            runtimeCtx.RHS = 1;
            Operations.LTE(runtimeCtx, scopeCtx, []);
            assert.equal(runtimeCtx.LHS, 0);
        });
        it('Operations.LTE(2, 2) は 1', function() {
            var runtimeCtx = new RuntimeContext(parseContext);
            var scopeCtx = new ScopeContext();
            runtimeCtx.LHS = 2;
            runtimeCtx.RHS = 2;
            Operations.LTE(runtimeCtx, scopeCtx, []);
            assert.equal(runtimeCtx.LHS, 1);
        });
    });

    // JMP
    it('Operations.JMP("label1") は runtimeCtx.PC = 100', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        Operations.JMP(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 100);
    });

    // JZ
    it('Operations.JZ("label1") は runtimeCtx.PC = 100', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        runtimeCtx.LHS = 0;
        Operations.JZ(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 100);
    });
    it('Operations.JZ("label1") は runtimeCtx.PC = 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        runtimeCtx.LHS = 1;
        Operations.JZ(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 0);
    });

    // JNZ
    it('Operations.JNZ("label1") は runtimeCtx.PC = 100', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        runtimeCtx.LHS = 1;
        Operations.JNZ(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 100);
    });
    it('Operations.JNZ("label1") は runtimeCtx.PC = 0', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        runtimeCtx.LHS = 0;
        Operations.JNZ(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 0);
    });

    // CALL
    it('Operations.CALL("label1") は runtimeCtx.PC = 100, runtimeCtx.stack = [0]', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        var expectedPC = runtimeCtx.PC + 1;
        runtimeCtx.jumpTable = {"label1": 100, "label2": 200};
        Operations.CALL(runtimeCtx, scopeCtx, ["label1"]);
        assert.equal(runtimeCtx.PC, 100);
        assert.deepEqual(runtimeCtx.stack, [expectedPC]);
    });

    // RET
    it('Operations.RET() は runtimeCtx.PC = 0, runtimeCtx.stack = []', function() {
        var runtimeCtx = new RuntimeContext(parseContext);
        var scopeCtx = new ScopeContext();
        runtimeCtx.stack = [100];
        Operations.RET(runtimeCtx, scopeCtx, []);
        assert.equal(runtimeCtx.PC, 100);
        assert.deepEqual(runtimeCtx.stack, []);
    });
});
