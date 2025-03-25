
/**
 * ソースコードの解析
 *
 * @param {ParseContext} parseCtx - 解析コンテキスト
 * @returns {RuntimeContext} - 実行コンテキスト
 */
function execute(parseCtx) {
    var runtimeCtx = new RuntimeContext(parseCtx);
    runtimeCtx.PC = parseCtx.jumpTable["main"];
    while(runtimeCtx.processIsEnd() == false) {
        var call = parseCtx.callList[runtimeCtx.PC];
        var operation = call[0];
        var args = call.slice(1);
        var prePC = runtimeCtx.PC;
        // console.log("PC =", runtimeCtx.PC, operation);
        if(operation == Operations.EXIT) {
            console.log(runtimeCtx);
            console.log(runtimeCtx.scopeContextStack.tail(0));
        }
        // 実行
        operation(runtimeCtx, runtimeCtx.scopeContextStack.tail(0), args);

        // 標準出力
        // if(runtimeCtx.console.hasStdout()) {
        //     console.log(runtimeCtx.console.consumeStdout().join("\n"));
        // }

        if(runtimeCtx.PC != prePC) {
            // PCが変更されている場合はジャンプ命令が実行されたとみなす
            continue;
        } else {
            runtimeCtx.PC += 1;
        }
    }
    return runtimeCtx;
}


function SplitContext() {
    var self = this;
    self.mainPC = null;
    self.currentPC = null;
    self.parseCtx = null;
    self.runtimeCtx = null;
    self.processIsEnd = false;
}

/**
 * 分割実行の初期処理
 *
 * @param {ParseContext} parseCtx - 解析コンテキスト
 * @returns {SplitContext} - 分割実行コンテキスト
 */
function splitExecuteInit(parseCtx) {
    var splitContext = new SplitContext();
    var runtimeCtx = new RuntimeContext(parseCtx);
    splitContext.mainPC = parseCtx.jumpTable["main"];
    splitContext.currentPC = splitContext.mainPC;
    splitContext.parseCtx = parseCtx;
    splitContext.runtimeCtx = runtimeCtx;
    return splitContext;
}

/**
 * 分割実行のメイン処理
 * 
 *
 * @param {SplitContext} splitContext - 分割実行コンテキスト
 * @param {number} count - 何回の処理で中断するか
 * @returns {RuntimeContext} - 実行コンテキスト
 */
function splitExecuteMain(splitContext, count) {
    var parseCtx = splitContext.parseCtx;
    var runtimeCtx = splitContext.runtimeCtx;
    var counter = 0;
    while(runtimeCtx.processIsEnd() == false) {
        if(counter >= count) {
            break;
        }

        var call = parseCtx.callList[runtimeCtx.PC];
        var operation = call[0];
        var args = call.slice(1);
        var prePC = runtimeCtx.PC;
        // console.log("PC =", runtimeCtx.PC, operation);
        if(operation == Operations.EXIT) {
            console.log(runtimeCtx);
            console.log(runtimeCtx.scopeContextStack.tail(0));
        }
        // 実行
        operation(runtimeCtx, runtimeCtx.scopeContextStack.tail(0), args);

        // 標準出力
        // if(runtimeCtx.console.hasStdout()) {
        //     console.log(runtimeCtx.console.consumeStdout().join("\n"));
        // }

        if(runtimeCtx.PC != prePC) {
            // PCが変更されている場合はジャンプ命令が実行されたとみなす
            continue;
        } else {
            runtimeCtx.PC += 1;
        }
        counter += 1;
    }
    splitContext.currentPC = runtimeCtx.PC;
    splitContext.processIsEnd = runtimeCtx.processIsEnd();
    return runtimeCtx;
}
