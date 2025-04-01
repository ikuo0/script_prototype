
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
        VAR A = 1
        VAR B = 0
        if (A > B) {
            print("A is zero");
        }
    */
    var operations_list = [
        [Operations.PRINT_STR, "START"],          // 0: print("START")
        [Operations.DATA, "A", 1],                // 1: A = 1
        [Operations.DATA, "B", 0],                // 2: B = 0
        [Operations.LOADLHS, "A"],                // 3: LHS ← A
        [Operations.LOADRHS, "B"],                // 4: RHS ← B
        [Operations.GT],                          // 5: if (LHS > RHS) LHS = 1 else LHS = 0
        [Operations.JZ, "end_if"],                // 6: if LHS == 0, jump to end_if
        [Operations.PRINT_STR, "A is greater B"], // 7: print("A is greater B")
        [Operations.PRINT_STR, "END"],            // 8: print("END")
        [Operations.EXIT],                        // 9: EXIT:
    ];
    

    // ジャンプテーブルを設定する
    var jumpTable = {
        "end_if": 8,
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
