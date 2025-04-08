
/**
 * 実行時コンテキスト
 * @constructor
 * @property {number} PC プログラムカウンタ
 * @property {number} LHS 左辺レジスタ
 * @property {number} RHS 右辺レジスタ
 * @property {Object.<string, number>} variable 変数
 * @property {Object.<string, number>} jumpTable ジャンプテーブル
 */
function RuntimeContext(jumpTable) {
    var self = this;
    self.PC = 0;
    self.LHS = 0;
    self.RHS = 0;
    self.variable = {};
    self.jumpTable = jumpTable;
}

/**
 * 命令クラス
 */
function Operations(){};

/**
 * 変数を作る
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] 変数名
 * @param {number} args[1] 初期値
 */
Operations.DATA = function DATA(runtimeCtx, args) {
    runtimeCtx.variable[args[0]] = args[1];
}

/**
 * LHSレジスタに変数から値を読み込む
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} args[0] 変数名
 */
Operations.LOADLHS = function LOADLHS(runtimeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.variable[args[0]];
}

/**
 * RHSレジスタに値を設定する
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} args[0] 変数名
 */
Operations.LOADRHS = function LOADRHS(runtimeCtx, args) {
    runtimeCtx.RHS = runtimeCtx.variable[args[0]];
}

/**
 * LHSレジスタの値を変数にコピーする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] 変数名
 */
Operations.STORELHS = function STORELHS(runtimeCtx, args) {
    runtimeCtx.variable[args[0]] = runtimeCtx.LHS;
}

/**
 * LHSレジスタにRHSレジスタの値を加算し、結果をLHSレジスタに格納する
 * @param {RuntimeContext} runtimeCtx 
 */
Operations.ADD = function ADD(runtimeCtx, args) {
    runtimeCtx.LHS = runtimeCtx.LHS + runtimeCtx.RHS;
}

/**
 * レジスタの値を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} args[0] レジスタ名
 */
Operations.PRINT_REG = function PRINT_REG(runtimeCtx, args) {
    console.log(runtimeCtx[args[0]]);
}

/**
 * 変数の値を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] 変数名
 */
Operations.PRINT_VAR = function PRINT_VAR(runtimeCtx, args) {
    console.log(runtimeCtx.variable[args[0]]);
}

/**
 * 文字列を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] 文字列
 */
Operations.PRINT_STR = function PRINT_STR(runtimeCtx, args) {
    console.log(args[0]);
}

/**
 * LHS と RHS を比較して、LHSのほうが大きい場合にLHSに1を設定する
 * 事前に LHS と RHS に値を設定しておく必要がある
 * @param {RuntimeContext} runtimeCtx
 */
Operations.GT = function GT(runtimeCtx, args) {
    if (runtimeCtx.LHS > runtimeCtx.RHS) {
        runtimeCtx.LHS = 1;
    } else {
        runtimeCtx.LHS = 0;
    }
}

/**
 * LHS と RHS を比較して、LHSのほうが大きいか等しい場合にLHSに1を設定する
 * 事前に LHS と RHS に値を設定しておく必要がある
 * @param {RuntimeContext} runtimeCtx
 */
Operations.GE = function GE(runtimeCtx, args) {
    if (runtimeCtx.LHS >= runtimeCtx.RHS) {
        runtimeCtx.LHS = 1;
    } else {
        runtimeCtx.LHS = 0;
    }
}

/**
 * 指定したラベルにジャンプする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] ラベル名
 */
Operations.JMP = function JMP(runtimeCtx, args) {
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
}
/**
 * LHS の値が 0 だったら指定したラベルにジャンプする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] ラベル名
 */
Operations.JZ = function JZ(runtimeCtx, args) {
    if (runtimeCtx.LHS === 0) {
        runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
    }
}

/**
 * 終了命令
 * @param {RuntimeContext} runtimeCtx
 */
Operations.EXIT = function EXIT(runtimeCtx, args) {
    // NOP
}

function execute() {
    /*
        int i = 0;
        while (i < 10) {
            print(i);
            i = i + 1;
        }
    */
        var operations_list = [
            [Operations.DATA, "i", 0],           // 0: i = 0
            [Operations.DATA, "_limit", 10],     // 1: _limit = 10
            [Operations.DATA, "_inc", 1],        // 2: _inc = 1
            // loop_start                        // ラベル: ループ開始
            [Operations.LOADLHS, "i"],           // 3: LHS ← i
            [Operations.LOADRHS, "_limit"],      // 4: RHS ← _limit
            [Operations.GE],                     // 5: LHS = (i >= 10) ? 1 : 0
            [Operations.JZ, "loop_body"],        // 6: if LHS == 0 → ループ続行
            [Operations.JMP, "loop_end"],        // 7: 条件を満たさなければループ終了
            // loop_body                         // ラベル: ループ本体
            [Operations.PRINT_VAR, "i"],         // 8: print(i)
            [Operations.LOADLHS, "i"],           // 9: LHS ← i
            [Operations.LOADRHS, "_inc"],        // 10: RHS ← 1
            [Operations.ADD],                    // 11: LHS = i + 1
            [Operations.STORELHS, "i"],          // 12: i = LHS
            [Operations.JMP, "loop_start"],      // 13: ループ先頭へ戻る
            // loop_end                          // ラベル: ループ終了
            [Operations.PRINT_STR, "LOOP DONE"], // 14: print("LOOP DONE")
            [Operations.EXIT],                   // 15: プログラム終了
        ];

    // ジャンプテーブルを設定する
    var jumpTable = {
        "loop_start": 3,
        "loop_body": 8,
        "loop_end": 14,
    }
    var runtimeCtx = new RuntimeContext(jumpTable);
    while(runtimeCtx.PC < operations_list.length) {
        var operation = operations_list[runtimeCtx.PC];
        var prePC = runtimeCtx.PC;
        operation[0](runtimeCtx, operation.slice(1));
        if(runtimeCtx.PC !== prePC) {
            // PC が変更された場合はPCの加算をスキップする
        } else {
            runtimeCtx.PC += 1;
        }
    }
}

execute();
