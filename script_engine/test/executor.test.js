const { __include__module } = require('./test_helper');
__include__module('utils.js');
__include__module('runtime.js');
__include__module('parser.js');
__include__module('operations.js');
__include__module('executor.js');
var assert = require('assert');

describe('execute', function() {
    it('簡単な分岐、標準出力', function() {
        var source = [
            "MAIN",
            "  DATA A 3",
            "  CMP_GREATER FLAG A 2",
            "  IF FLAG",
            "    PRINT \"A is greater than 2\"",
            "  END_IF",
            "  PRINT \"END\"",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        // console.log(parseCtx);
        // outputParseContextsDump(parseCtx);
        // console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var runtimeCtx = execute(parseCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), ["A is greater than 2", "END"]);
    });
    it('ELSE 分岐', function() {
        var source = [
            "MAIN",
            "  DATA A 1",
            "  CMP_GREATER FLAG A 2",
            "  IF FLAG",
            "    PRINT \"A is greater than 2\"",
            "  ELSE",
            "    PRINT \"A is not greater than 2\"",
            "  END_IF",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        // console.log(parseCtx);
        // outputParseContextsDump(parseCtx);
        // console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var runtimeCtx = execute(parseCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), ["A is not greater than 2"]);
    });
    it('ループ', function() {
        var source = [
            "MAIN",
            "PRINT \"START MAIN\"",
            "  LOOP 3 i",
            "    PRINT \"i=\" \"@i\"",
            "      LOOP 4 j",
            "        PRINT \"j=\" \"@j\"",
            "      END_LOOP",
            "  END_LOOP",
            "  PRINT \"END MAIN\"",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        // console.log(parseCtx);
        // outputParseContextsDump(parseCtx);
        // console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var runtimeCtx = execute(parseCtx);
        // console.log(runtimeCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), [
            "START MAIN",
            "i=1",
            "j=1",
            "j=2",
            "j=3",
            "j=4",
            "i=2",
            "j=1",
            "j=2",
            "j=3",
            "j=4",
            "i=3",
            "j=1",
            "j=2",
            "j=3",
            "j=4",
            "END MAIN"
        ]);
    });
    it('関数定義、関数呼び出し', function() {
        var source = [
            "FUNCTION Hello",
            "  PRINT \"Hello!\"",
            "END_FUNCTION",
            "FUNCTION World",
            "  PRINT \"World!\"",
            "END_FUNCTION",
            "FUNCTION call_branch a",
            "  IF a",
            "    CALL_FUNCTION Hello",
            "  ELSE",
            "    CALL_FUNCTION World",
            "  END_IF",
            "END_FUNCTION",
            "",
            "MAIN",
            "PRINT \"START MAIN\"",
            "  DATA a 1",
            "  DATA b 0",
            "  CALL_FUNCTION call_branch a",
            "  CALL_FUNCTION call_branch b",
            "  PRINT \"END MAIN\"",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        // console.log(parseCtx);
        // outputParseContextsDump(parseCtx);
        // console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var runtimeCtx = execute(parseCtx);
        // console.log(runtimeCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), ["START MAIN", "Hello!", "World!", "END MAIN"]);
    });
    it('ｎ番目のフィボナッチ数を求める', function() {
        var source = [
            "FUNCTION FUNC_FIB n result",
            "  DATA flag 0",
            "  CMP_EQUAL flag n 0",
            "  IF flag",
            "    DATA result 0",
            "    RETURN",
            "  END_IF",
            "",
            "  CMP_EQUAL flag n 1",
            "  IF flag",
            "    DATA result 1",
            "    RETURN",
            "  END_IF",
            "",
            "  DATA arg1 0",
            "  DATA res1 0",
            "  MATH_SUB arg1 n 1",
            "  CALL_FUNCTION FUNC_FIB arg1 res1",
            "",
            "  DATA arg2 0",
            "  DATA res2 0",
            "  MATH_SUB arg2 n 2",
            "  CALL_FUNCTION FUNC_FIB arg2 res2",
            "",
            "  MATH_ADD result res1 res2",
            "END_FUNCTION",
            "",
            "MAIN",
            "  PRINT \"START MAIN\"",
            "  DATA n 7",
            "  DATA result 0",
            "  CALL_FUNCTION FUNC_FIB n result",
            "  PRINT \"@n\" \"-th FIBONACCI = \" \"@result\"",
            "  PRINT \"END MAIN\"",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        console.log(parseCtx);
        outputParseContextsDump(parseCtx);
        console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var runtimeCtx = execute(parseCtx);
        console.log(runtimeCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), ["START MAIN", "7-th FIBONACCI = 13", "END MAIN"]);
    });
    it('分割実行でｎ番目のフィボナッチ数を求める', function() {
        var source = [
            "FUNCTION FUNC_FIB n result",
            "  DATA flag 0",
            "  CMP_EQUAL flag n 0",
            "  IF flag",
            "    DATA result 0",
            "    RETURN",
            "  END_IF",
            "",
            "  CMP_EQUAL flag n 1",
            "  IF flag",
            "    DATA result 1",
            "    RETURN",
            "  END_IF",
            "",
            "  DATA arg1 0",
            "  DATA res1 0",
            "  MATH_SUB arg1 n 1",
            "  CALL_FUNCTION FUNC_FIB arg1 res1",
            "",
            "  DATA arg2 0",
            "  DATA res2 0",
            "  MATH_SUB arg2 n 2",
            "  CALL_FUNCTION FUNC_FIB arg2 res2",
            "",
            "  MATH_ADD result res1 res2",
            "END_FUNCTION",
            "",
            "MAIN",
            "  PRINT \"START MAIN\"",
            "  DATA n 7",
            "  DATA result 0",
            "  CALL_FUNCTION FUNC_FIB n result",
            "  PRINT \"@n\" \"-th FIBONACCI = \" \"@result\"",
            "  PRINT \"END MAIN\"",
            "END_MAIN",
        ].join("\n");
        console.log("#### PARSE ####");
        var parseCtx = parse(source);
        console.log(parseCtx);
        outputParseContextsDump(parseCtx);
        console.log(parseCtx.jumpTable);
        console.log("#### EXECUTE ####");
        var splitCtx = splitExecuteInit(parseCtx);
        while(splitCtx.processIsEnd == false) {
            var runtimeCtx = splitExecuteMain(splitCtx, 5);
            // console.log("PC=" + runtimeCtx.PC);
        }
        console.log(runtimeCtx);
        console.log("#### ASSERT ####");
        assert.deepEqual(runtimeCtx.console.getHistory(), ["START MAIN", "7-th FIBONACCI = 13", "END MAIN"]);
    });
});
