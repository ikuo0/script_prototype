
/**
 * 実行時コンテキスト
 * @constructor
 * @property {number} PC プログラムカウンタ
 * @property {number} LHS 左辺レジスタ
 * @property {number} RHS 右辺レジスタ
 * @property {Object.<string, number>} variable 変数
 */
function RuntimeContext() {
    var self = this;
    self.PC = 0;
    self.LHS = 0;
    self.RHS = 0;
    self.variable = {};
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

function execute() {
    /*
    VAR A = 1
    VAR B = 2
    VAR C = 0
    C = A + B
    */
    var operations_list = [
        [Operations.DATA, 'A', 1],
        [Operations.DATA, 'B', 2],
        [Operations.DATA, 'C', 0],
        [Operations.LOADLHS, 'A'],
        [Operations.LOADRHS, 'B'],
        [Operations.ADD],
        [Operations.STORELHS, 'C'],
        [Operations.PRINT_STR, 'C = '],
        [Operations.PRINT_VAR, 'C'],
        [Operations.PRINT_STR, 'LHS = '],
        [Operations.PRINT_REG, 'LHS'],
        [Operations.PRINT_STR, 'RHS = '],
        [Operations.PRINT_REG, 'RHS'],
    ];

    var runtimeCtx = new RuntimeContext();
    while(runtimeCtx.PC < operations_list.length) {
        var operation = operations_list[runtimeCtx.PC];
        operation[0](runtimeCtx, operation.slice(1));
        runtimeCtx.PC += 1;
    }
}

execute();
