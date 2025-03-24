
function Operations() {}
/**
 * 引数を取得する
 * 数値変換可能かつ小数点を含む場合は float
 * 数値変換可能であれba　int
 * % で始まる場合はレジスタ
 * 変数名の場合はローカル変数
 * それ以外はエラー
 * @param {*} runtimeCtx 
 * @param {*} scopeCtx 
 * @param {*} key_or_value 
 * @returns 
 */
Operations._get_arg_value = function(runtimeCtx, scopeCtx, key_or_value) {
    if(typeof key_or_value == "string") {
        var c = key_or_value.charAt(0);
        var kv = key_or_value.slice(1);
        // 先頭が % = レジスタ
        // 先頭が @ = 変数
        // 先頭が * = 文字列
        if(c == "%") {
            if(kv in runtimeCtx) {
                return runtimeCtx[kv];
            } else {
                error("レジスタ " + kv + " は存在しません");
            }
        } else if(c == "@") {
            if(kv in scopeCtx.variable) {
                return scopeCtx.variable[kv];
            } else {
                error("変数 " + kv + " は存在しません");
            }
        } else if(c == "*") {
            return kv;
        } else {
            error("不正な引数: " + String(key_or_value));
        }
    } else if(typeof key_or_value == "number") {
        return key_or_value;
    } else {
        error("不正な引数: " + (typeof key_or_value) + ", " + String(key_or_value));
    }
}
/**
 * レジスタや変数に値を設定する
 * @param {*} runtimeCtx 
 * @param {*} scopeCtx 
 * @param {*} lhs 
 * @param {*} rhs 
 */
Operations._set_arg_value = function(runtimeCtx, scopeCtx, lhs, rhs) {
    var value = Operations._get_arg_value(runtimeCtx, scopeCtx, rhs);
    var c = lhs.charAt(0);
    var k = lhs.slice(1);
    if(c == "%") {
        if(k in runtimeCtx) {
            runtimeCtx[k] = value;
        } else {
            error("レジスタ " + k + " は存在しません");
        }
    } else if(c == "@") {
        scopeCtx.variable[k] = value;
        // if(k in scopeCtx.variable) {
        //     scopeCtx.variable[k] = value;
        // } else {
        //     error("変数 " + lhs + " は存在しません");
        // }
    } else {
        error("不正な左辺値: " + lhs);
    }
}
// NOP
Operations.NOP = function NOP(runtimeCtx, scopeCtx, args) {
    // NOP
}
// exit
Operations.EXIT = function EXIT(runtimeCtx, scopeCtx, args) {
    runtimeCtx.PC = runtimeCtx.commandSize;
}
// 変数操作
Operations.DATA = function DATA(runtimeCtx, scopeCtx, args) {
    var lhs = args[0];
    var rhs = args[1];
    var c = lhs.charAt(0);
    var k = lhs.slice(1);
    if(c != "@") {
        error("変数名が不正です: " + lhs);
    }
    scopeCtx.variable[k] = Operations._get_arg_value(runtimeCtx, scopeCtx, rhs);
}
Operations.MOV = function MOV(runtimeCtx, scopeCtx, args, createVar) {
    Operations._set_arg_value(runtimeCtx, scopeCtx, args[0], args[1], createVar);
}
Operations.ADDVARIABLE = function ADDVARIABLE(runtimeCtx, scopeCtx, args) {
    var lhs = args[0];
    var rhs = args[1];
    var lvalue = Operations._get_arg_value(runtimeCtx, scopeCtx, lhs);
    var value = Operations._get_arg_value(runtimeCtx, scopeCtx, rhs);
    Operations._set_arg_value(runtimeCtx, scopeCtx, lhs, lvalue + value);
}
// スタック操作
Operations.PUSH = function PUSH(runtimeCtx, scopeCtx, args) {
    runtimeCtx.stack.push(Operations._get_arg_value(runtimeCtx, scopeCtx, args[0]));
}
Operations.POP = function POP(runtimeCtx, scopeCtx, args) {
    Operations._set_arg_value(runtimeCtx, scopeCtx, args[0], runtimeCtx.stack.pop(), false);
}
Operations.PEEK = function PEEK(runtimeCtx, scopeCtx, args) {
    // POP せずスタックを参照する
    Operations._set_arg_value(runtimeCtx, scopeCtx, args[0], runtimeCtx.stack.tail(args[1]), false);
}
Operations.POKE = function POKE(runtimeCtx, scopeCtx, args) {
    runtimeCtx.stack[runtimeCtx.stack.length - (args[0] + 1)] = Operations._get_arg_value(runtimeCtx, scopeCtx, args[1]);
}
// レジスタ操作
Operations.LOADLHS = function LOADLHS(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = Operations._get_arg_value(runtimeCtx, scopeCtx, args[0]);
}
Operations.LOADRHS = function LOADRHS(runtimeCtx, scopeCtx, args) {
    runtimeCtx.RHS = Operations._get_arg_value(runtimeCtx, scopeCtx, args[0]);
}
Operations.LOADLR = function LOADLR(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = Operations._get_arg_value(runtimeCtx, scopeCtx, args[0]);
    runtimeCtx.RHS = Operations._get_arg_value(runtimeCtx, scopeCtx, args[1]);
}
// 2項演算
Operations.ADD = function ADD(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS + runtimeCtx.RHS;
}
Operations.SUB = function SUB(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS - runtimeCtx.RHS;
}
Operations.MUL = function MUL(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS * runtimeCtx.RHS;
}
Operations.DIV = function DIV(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS / runtimeCtx.RHS;
}

// 比較
Operations.EQ = function EQ(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS == runtimeCtx.RHS ? 1 : 0;
}
Operations.NEQ = function EQ(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS != runtimeCtx.RHS ? 1 : 0;
}
Operations.GT = function GT(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS > runtimeCtx.RHS ? 1 : 0;
}
Operations.GTE = function GTE(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS >= runtimeCtx.RHS ? 1 : 0;
}
Operations.LT = function LT(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS < runtimeCtx.RHS ? 1 : 0;
}
Operations.LTE = function LTE(runtimeCtx, scopeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS <= runtimeCtx.RHS ? 1 : 0;
}
// ジャンプ
Operations.JMP = function JMP(runtimeCtx, scopeCtx, args) {
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
}
Operations.JZ = function JZ(runtimeCtx, scopeCtx, args) {
    if(runtimeCtx.LHS == 0) {
        runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
    }
}
Operations.JNZ = function JNZ(runtimeCtx, scopeCtx, args) {
    if(runtimeCtx.LHS != 0) {
        runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
    }
}
Operations.CALL = function CALL(runtimeCtx, scopeCtx, args) {
    runtimeCtx.stack.push(runtimeCtx.PC + 1);
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
    runtimeCtx.scopeContextStack.push(new ScopeContext());
}
Operations.RET = function RET(runtimeCtx, scopeCtx, args) {
    runtimeCtx.PC = runtimeCtx.stack.pop();
    runtimeCtx.scopeContextStack.pop();
}

// 副作用
Operations.parsePrintArg = function(runtimeCtx, scopeCtx, x) {
    // % で始まる場合はレジスタ
    // @ で始まる場合は変数
    // それ以外は文字列として扱う
    var c = x.charAt(0);
    if(c == "%") {
        return runtimeCtx[x.slice(1)];
    } else if(c == "@") {
        return scopeCtx.variable[x.slice(1)];
    } else if(c == "*") {
        return String(x.slice(1));
    } else {
        error("不正な引数: " + x);
    }
}
Operations.PRINT = function PRINT(runtimeCtx, scopeCtx, args) {
    var textArr = [];
    for(var i = 0; i < args.length; i++) {
        var msg = Operations.parsePrintArg(runtimeCtx, scopeCtx, args[i]);
        textArr.push(msg);
    }
    runtimeCtx.console.append(textArr.join(""));
}
