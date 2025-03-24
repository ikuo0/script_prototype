
function ParseToken(value, type) {
    var self = this;
    self.value = value;
    self.type = type;
}

/**
 * 解析時の文脈情報を保持するコンテキストクラス
 *
 * @constructor
 * @property {ParseToken[]} statusStack - 解析ステータスを積むスタック
 * @property {number} parseIndex - 解析中の行番号
 * @property {ParseToken[][]} callList - 呼び出しリスト
 * @property {number} labelIndex - ラベルインデックス
 * @property {string[]} ifLabelStack - IF文のラベルを積むスタック
 * @property {string[]} loopLabelStack - ループ文のラベルを積むスタック
 * @property {string[]} functionLabelStack - 関数のラベルを積むスタック
 * @property {ParseToken[]} commandStack - コマンド名を積むスタック
 * @property {Object} jumpTable - ジャンプテーブル
 */
function ParseContext() {
    var self = this;
    self.statusStack = ["none"];
    self.parseIndex = 0;
    self.callList = [];
    self.labelIndex = 0;
    self.ifLabelStack = [];
    self.loopLabelStack = [];
    self.functionLabelStack = [];
    self.commandStack = [];
    self.jumpTable = {};
    self.getStatus = function() {
        var me = this;
        return me.statusStack.tail(0);
    }
    self.createJumpLabel = function(prefix) {
        var me = this;
        var label = prefix + String(me.labelIndex);
        me.labelIndex += 1;
        return label;
    }
}

function ParseTokenTypes() {}
ParseTokenTypes.IDENTITY = Enum(1);
ParseTokenTypes.INTEGER = Enum();
ParseTokenTypes.FLOAT = Enum();
ParseTokenTypes.STRING = Enum();

function createParseToken(value, inQuotes) {
    if(inQuotes) {
        return new ParseToken(value, ParseTokenTypes.STRING);
    } else if(isNumeric(value)) {
        if(value.includes(".")) {
            return new ParseToken(parseFloat(value), ParseTokenTypes.FLOAT);
        } else {
            return new ParseToken(parseInt(value), ParseTokenTypes.INTEGER);
        }
    } else if(isIdentity(value)) {
        return new ParseToken(value, ParseTokenTypes.IDENTITY);
    } else {
        error("不正なトークン: " + value);
    }
}

// function splitTokens(input) {
//     var result = [];
//     var current = "";
//     var inQuotes = false;
    
//     for (var i = 0; i < input.length; i++) {
//         var char = input[i];
//         if (char === '"') {
//             if(inQuotes) {
//                 var token = createParseToken(current, inQuotes);
//                 result.push(token);
//                 current = '';
//             }
//             inQuotes = !inQuotes;
//         } else if (char === " " && !inQuotes) {
//             if (current !== "") {
//                 var token = createParseToken(current, inQuotes);
//                 result.push(token);
//                 current = '';
//             }
//         } else {
//             current += char;
//         }
//     }

//     if(inQuotes) {
//         error("クォートが閉じられていません, " + input);
//     }
    
//     if (current !== "") {
//         var token = createParseToken(current, inQuotes);
//         result.push(token);
//     }
    
//     return result;
// }
function splitTokens(input) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < input.length; i++) {
        var char = input[i];

        if (char === '"') {
            if (inQuotes) {
                var token = createParseToken(current, inQuotes);
                result.push(token);
                current = '';
            }
            inQuotes = !inQuotes;
        } else if (char === ";" && !inQuotes) {
            // クォート外の ; はコメント → 処理を終了
            break;
        } else if (char === " " && !inQuotes) {
            if (current !== "") {
                var token = createParseToken(current, inQuotes);
                result.push(token);
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (inQuotes) {
        error("クォートが閉じられていません, " + input);
    }

    if (current !== "") {
        var token = createParseToken(current, inQuotes);
        result.push(token);
    }

    return result;
}


function sourceToTokensList(source) {
    var lines = source.trim().split(/[\r\n]+/);
    var token_list = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if(line.length == 0) {
            continue;
        }
        var tokens = splitTokens(line);
        token_list.push(tokens);
    }
    return token_list;
}

/**
 * 右辺値のトークンを変数参照指示に変換
 *
 * @param {ParseToken} rhs - 解析時の文脈情報
 * @returns {any} - 変換後の文字列
 */
function convertReferenceToken(rhs) {
    if(rhs.type == ParseTokenTypes.IDENTITY) {
        return "@" + rhs.value;
    } else {
        return rhs.value;
    }
}

/**
 * 左辺値のトークンを変数参照指示に変換
 *
 * @param {ParseToken} lhs - 解析時の文脈情報
 * @returns {string} - 変換後の文字列
 */
function convertAssignmentTarget(lhs) {
    return "@" + lhs.value;
}


/**
 * グローバルスコープの解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseGlobal(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "MAIN") {
        parseCtx.statusStack.push("main");
        if("main" in parseCtx.jumpTable) {
            error("main関数は既に定義されています");
        }
        parseCtx.jumpTable["main"] = parseCtx.callList.length;
    } else if(operation.value == "FUNCTION") {
        parseCtx.statusStack.push("function");
        parseCtx.commandStack.push(command);
        var function_label_token = args[0];
        if(function_label_token.type != ParseTokenTypes.IDENTITY) {
            error("関数名が不正です: " + function_label_token.value);
        }
        var function_label = function_label_token.value;
        if(function_label in parseCtx.jumpTable) {
            error("関数 " + function_label + " は既に定義されています");
        }
        parseCtx.jumpTable[function_label] = parseCtx.callList.length;

        var functionArgsLength = args.length - 1;
        // スタック先頭は引数の数
        // 必要な引数の数と実際の引数の数を比較し、異なる場合はエラー終了
        var labelFunctionStart = parseCtx.createJumpLabel("function_start_");
        parseCtx.callList.extend([
            [Operations.PEEK, "%LHS", 1], // 引数の数を取得
            [Operations.LOADRHS, functionArgsLength],
            [Operations.EQ],
            [Operations.JNZ, labelFunctionStart],
            [Operations.PRINT, "引数の数が異なります, " + function_label + ", 必要な引数の数: " + String(functionArgsLength)],
            [Operations.EXIT],
        ]);
        parseCtx.jumpTable[labelFunctionStart] = parseCtx.callList.length;
        for(var i = 0; i < functionArgsLength; i++) {
            var argToken = args[i + 1];
            if(argToken.type != ParseTokenTypes.IDENTITY) {
                error("関数の引数には変数を指定してください、リテラル値は指定できません。 引数が不正です: " + argToken.value);
            }
            parseCtx.callList.extend([
                [Operations.DATA, convertAssignmentTarget(argToken), 0],
                [Operations.PEEK, convertAssignmentTarget(argToken), i + 2],
            ]);
        }
        var labelFunctionEnd = parseCtx.createJumpLabel("function_end_");
        parseCtx.functionLabelStack.push(labelFunctionEnd);
    }
}

/**
 * グローバルスコープ以外、全てのスコープで共通の解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseDefault(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "DATA") {
        // DATA [変数名] [値]
        var lToken = args[0];
        if(lToken.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + lToken.value);
        }
        var rToken = args[1];
        parseCtx.callList.extend([
            [Operations.DATA, convertAssignmentTarget(lToken), convertReferenceToken(rToken)]
        ]);
    } else if(operation.value =="IF"){
        // 第1引数がTRUEなら処理、そうでなければジャンプ
        var boolToken = args[0];
        if(boolToken.type != ParseTokenTypes.IDENTITY) {
            error("IF文の第1引数が不正です、IF の引数に指定できるのは bool型の変数のみです: " + boolToken.value);
        }
        parseCtx.statusStack.push("if");
        var label = parseCtx.createJumpLabel("end_if_or_else_");
        parseCtx.ifLabelStack.push(label);
        parseCtx.callList.extend([
            [Operations.LOADLHS, convertReferenceToken(boolToken)],
            [Operations.LOADRHS, 1],
            [Operations.EQ],
            [Operations.JZ, parseCtx.ifLabelStack.tail(0)],
        ])
    } else if(operation.value == "CALL_FUNCTION") {
        // CALL_FUNCTION [関数名] [引数] [引数] ...
        var funcNameToken = args[0];
        if(funcNameToken.type != ParseTokenTypes.IDENTITY) {
            error("関数名が不正です: " + funcNameToken.value);
        }
        var argTokens = args.slice(1); // 関数名を省いた残りの引数配列
        var funcArgsLength = argTokens.length;
        // 引数をPUSH、参照する順番と逆にスタックに積む
        for(var i = funcArgsLength - 1; i >= 0; i -= 1) {
            var token = argTokens[i];
            if(token.type != ParseTokenTypes.IDENTITY) {
                error("変数名が不正です: " + token.value + ", type=" + token.type);
            }
            parseCtx.callList.push([Operations.PUSH, convertAssignmentTarget(token)]);
        }
        // 引数の数をPUSH
        parseCtx.callList.push([Operations.PUSH, funcArgsLength]);
        // 関数を呼び出す、引数（参照渡し）をPOPする
        parseCtx.callList.push([Operations.CALL, funcNameToken.value]);
        // 引数の数を捨てる
        parseCtx.callList.push([Operations.POP, "%W"]);
        for(var i = 0; i < funcArgsLength; i++) {
            var token = argTokens[i];
            // 引数処理でIdentity検査済みなのでここではチェックしない
            parseCtx.callList.push([Operations.POP, convertAssignmentTarget(token)]);
        }

    } else if(operation.value == "LOOP") {
        // LOOP [回数] [カウンタ変数名]
        // 回数分ループ
        // 引数の数は２個
        if(args.length != 2) {
            error("LOOP の引数の数が不正です: " + args.length);
        }
        var countToken = args[0];
        if(countToken.type != ParseTokenTypes.INTEGER) {
            error("ループ回数が不正です: " + countToken.value);
        }
        var countRefToken = args[1];
        if(countRefToken.type != ParseTokenTypes.IDENTITY) {
            error("カウンタ変数名が不正です: " + countRefToken.value);
        }
        parseCtx.commandStack.push([operation].concat(args));
        parseCtx.statusStack.push("loop");
        parseCtx.callList.extend([
            [Operations.DATA, convertReferenceToken(countRefToken), 1],
        ]);
        var startLabel = parseCtx.createJumpLabel("loop_start_");
        var endLabel = parseCtx.createJumpLabel("loop_end_");
        parseCtx.jumpTable[startLabel] = parseCtx.callList.length;
        parseCtx.loopLabelStack.push(endLabel);
        parseCtx.loopLabelStack.push(startLabel);
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(countRefToken), convertReferenceToken(countToken)],
            [Operations.LTE],
            [Operations.JZ, endLabel],
        ]);
    } else if(operation.value == "RETURN") {
        parseCtx.callList.extend([
            [Operations.JMP, parseCtx.functionLabelStack.tail(0)],
        ]);
    ////////////////////////////////////////
    // 計算
    ////////////////////////////////////////
    } else if(operation.value == "MATH_ADD") {
        // MATH_ADD [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("MATH_ADD の引数の数が不正です: " + args.length);
        }
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.ADD],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "MATH_SUB") {
        // MATH_SUB [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("MATH_SUB の引数の数が不正です: " + args.length);
        }
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.SUB],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "MATH_MUL") {
        // MATH_MUL [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("MATH_MUL の引数の数が不正です: " + args.length);
        }
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.MUL],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "MATH_DIV") {
        // MATH_DIV [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("MATH_DIV の引数の数が不正です: " + args.length);
        }
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.DIV],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_GREATER") {
        // CMP_GREATER [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_GREATER の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.GT],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_GREATER_EQUAL") {
        // CMP_GREATER_EQUAL [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_GREATER_EQUAL の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.GTE],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_LESS") {
        // CMP_LESS [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_LESS の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.LT],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_LESS_EQUAL") {
        // CMP_LESS_EQUAL [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_LESS_EQUAL の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.LTE],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_EQUAL") {
        // CMP_EQUAL [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_EQUAL の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.EQ],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    } else if(operation.value == "CMP_NOT_EQUAL") {
        // CMP_NOT_EQUAL [変数名] [左辺値] [右辺値]
        if(args.length != 3) {
            error("CMP_NOT_EQUAL の引数の数が不正です: " + args.length);
        }
        // 比較結果を変数名に格納
        var result = args[0];
        if(result.type != ParseTokenTypes.IDENTITY) {
            error("代入処理エラー、第1引数の変数名が不正です: " + result.value);
        }
        var lToken = args[1];
        var rToken = args[2];
        parseCtx.callList.extend([
            [Operations.LOADLR, convertReferenceToken(lToken), convertReferenceToken(rToken)],
            [Operations.NEQ],
            [Operations.MOV, convertAssignmentTarget(result), "%LHS"],
        ]);
    ////////////////////////////////////////
    // 副作用
    ////////////////////////////////////////
    } else if(operation.value == "PRINT") {
        // PRINT [文字列]
        // 文字列を出力
        var token = args[0];
        var values = [];
        for(var i = 0; i < args.length; i++) {
            var token = args[i];
            var c = token.value[0];
            var rest = token.value.slice(1);
            if(c == "@" && isIdentity(rest)) {
                // 変数の中身を表示する
                values.push(token.value);
            } else if(c == "%" && isIdentity(rest)) {
                // レジスタの値を表示する
                values.push(token.value);
            } else {
                // 文字列であることを表す * を先頭に付与
                values.push("*" + token.value);
            }
        }
        parseCtx.callList.push([Operations.PRINT].concat(values));
    } else {
        error("未知のオペレーション: " + String(operation));
    }
}

/**
 * MAIN関数の解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseMain(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "END_MAIN") {
        var status = parseCtx.statusStack.pop();
        if(status != "main") {
            error("END_MAIN が不正です");
        }
        parseCtx.callList.push([Operations.EXIT]);
    } else {
        parseDefault(parseCtx, command);
    }
}

/**
 * 関数の解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseFunction(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "END_FUNCTION") {
        var status = parseCtx.statusStack.pop();
        var stack_command = parseCtx.commandStack.pop();
        // 関数の終了処理にラベルを設定
        parseCtx.jumpTable[parseCtx.functionLabelStack.pop()] = parseCtx.callList.length;
        // FUNCTION [関数名] [引数] [引数] ...
        var stack_args = stack_command.slice(2);
        if(stack_args.length > 0) {
            // 引数をスタックする
            // 「戻り先PC」、「引数」の分で +2 する
            for(var i = stack_args.length - 1; i >= 0; i -= 1) {
                var token = stack_args[i];
                parseCtx.callList.push([Operations.POKE, i + 2, convertReferenceToken(token)]);
            }
            parseCtx.callList.push([Operations.RET]);
        } else {
            parseCtx.callList.push([Operations.RET]);
        }
    } else {
        parseDefault(parseCtx, command);
    }
}

/**
 * IFの解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseIF(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "ELSE") {
        var end_if_label = parseCtx.ifLabelStack.pop();
        parseCtx.statusStack.pop();
        parseCtx.statusStack.push("else");
        var end_else_label = parseCtx.createJumpLabel("end_else_");
        parseCtx.ifLabelStack.push(end_else_label);
        parseCtx.callList.extend([
            [Operations.JMP, end_else_label],
        ]);
        parseCtx.jumpTable[end_if_label] = parseCtx.callList.length;
    } else if(operation.value == "END_IF") {
        var label = parseCtx.ifLabelStack.pop();
        parseCtx.jumpTable[label] = parseCtx.callList.length;
        parseCtx.statusStack.pop();
    } else {
        parseDefault(parseCtx, command);
    }
}

/**
 * ELSEの解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseELSE(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "END_IF") {
        var label = parseCtx.ifLabelStack.pop();
        parseCtx.jumpTable[label] = parseCtx.callList.length;
        parseCtx.statusStack.pop();
    } else {
        parseDefault(parseCtx, command);
    }
}

/**
 * LOOPの解析
 *
 * @param {ParseContext} parseCtx - 解析時の文脈情報
 * @param {ParseToken[]} command - 引数の配列
 */
function parseLOOP(parseCtx, command) {
    var operation = command[0];
    var args = command.slice(1);
    if(operation.value == "END_LOOP") {
        var stack_command = parseCtx.commandStack.pop();// LOOP 10 i 形式のコマンドが積まれている
        var countRefToken = stack_command[2];// カウンタ変数名を取得
        var startLabel = parseCtx.loopLabelStack.pop();
        var endLabel = parseCtx.loopLabelStack.pop();
        parseCtx.callList.extend([
            [Operations.ADDVARIABLE, convertReferenceToken(countRefToken), 1],
            [Operations.JMP, startLabel],
        ]);
        parseCtx.jumpTable[endLabel] = parseCtx.callList.length;
        parseCtx.statusStack.pop();
    } else {
        parseDefault(parseCtx, command);
    }
}

/**
 * ソースコードの解析
 *
 * @param {string} source - ソースコードテキスト
 */
function parse(source) {
    var tokensList = sourceToTokensList(source);
    var size = tokensList.length;
    var parseCtx = new ParseContext();
    while(parseCtx.parseIndex < size) {
        var status = parseCtx.getStatus();
        var command = tokensList[parseCtx.parseIndex];
        if(command[0].type != ParseTokenTypes.IDENTITY) {
            error("1つ目の単語がコマンドではありません、プログラムは [コマンド] [引数] [引数] ... の形式です: " + operation.value);
        }
        if(status == "none") {
            parseGlobal(parseCtx, command);
        } else if(status == "main") {
            parseMain(parseCtx, command);
        } else if(status == "function") {
            parseFunction(parseCtx, command);
        } else if(status == "if") {
            parseIF(parseCtx, command);
        } else if(status == "else") {
            parseELSE(parseCtx, command);
        } else if(status == "loop") {
            parseLOOP(parseCtx, command);
        } else {
            error("未知のステータス: " + status);
        }
        parseCtx.parseIndex += 1;
    }
    if(parseCtx.getStatus() != "none") {
        error("IF等のブロックが閉じられていません, status = " + parseCtx.getStatus());
    }
    if(!("main" in parseCtx.jumpTable)) {
        error("main関数が定義されていません");
    }
    return parseCtx;
}

function dumpParseContexts(parseCtx) {
    var objectDump = function(o) {
        if(typeof o == "function") {
            return o.name;
        } else {
            return String(o);
        }
    }

    var textArr = [];
    for(var i = 0; i < parseCtx.callList.length; i++) {
        var call = parseCtx.callList[i];
        var strArr = [String(i)];
        for(var j = 0; j < call.length; j++) {
            strArr.push(objectDump(call[j]));
        }
        textArr.push(strArr.join(", "));
    }
    return textArr;
}

function outputParseContextsDump(parseCtx) {
    var textArr = dumpParseContexts(parseCtx);
    console.log(textArr.join("\n"));
}
