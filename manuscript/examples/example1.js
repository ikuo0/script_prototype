
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
 * @param {string} arguments[1] 変数名
 * @param {number} arguments[2] 初期値
 */
Operations.DATA = function DATA(runtimeCtx) {
    runtimeCtx.variable[arguments[1]] = arguments[2];
}

/**
 * LHSレジスタに変数から値を読み込む
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} arguments[1] 変数名
 */
Operations.LOADLHS = function LOADLHS(runtimeCtx) {
    runtimeCtx.LHS = runtimeCtx.variable[arguments[1]];
}

/**
 * RHSレジスタに値を設定する
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} arguments[1] 変数名
 */
Operations.LOADRHS = function LOADRHS(runtimeCtx) {
    runtimeCtx.RHS = runtimeCtx.variable[arguments[1]];
}

/**
 * LHSレジスタの値を変数にコピーする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} arguments[1] 変数名
 */
Operations.STORELHS = function STORELHS(runtimeCtx) {
    runtimeCtx.variable[arguments[1]] = runtimeCtx.LHS;
}

/**
 * LHSレジスタにRHSレジスタの値を加算し、結果をLHSレジスタに格納する
 * @param {RuntimeContext} runtimeCtx 
 */
Operations.ADD = function ADD(runtimeCtx) {
    runtimeCtx.LHS = runtimeCtx.LHS + runtimeCtx.RHS;
}

/**
 * レジスタの値を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx 
 * @param {string} arguments[1] レジスタ名
 */
Operations.PRINT_REG = function PRINT(runtimeCtx) {
    console.log(runtimeCtx[arguments[1]]);
}

/**
 * 変数の値を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx
 * @param {string} arguments[1] 変数名
 */
Operations.PRINT_VAR = function PRINT(runtimeCtx) {
    console.log(runtimeCtx.variable[arguments[1]]);
}

/**
 * 文字列を標準出力に出力する
 * @param {RuntimeContext} runtimeCtx
 * @param {string} arguments[1] 文字列
 */
Operations.PRINT_STR = function PRINT(runtimeCtx) {
    console.log(arguments[1]);
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
        operation[0].apply(null, [runtimeCtx].concat(operation.slice(1)));
        runtimeCtx.PC += 1;
    }
}

execute();
