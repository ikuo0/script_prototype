/**
 * スコープコンテキスト
 * 関数呼び出し時等、スコープが変更された時にスタックに積む
 * ローカル変数等を管理する
 */
function ScopeContext() {
    var self = this;
    self.variable = {};
}

function Console() {
    var self = this;
    self.stdout = [];
    self.history = [];
    self.append = function(msg) {
        var me = this;
        me.stdout.push(msg);
        me.history.push(msg);
    }
    self.getStdout = function() {
        var me = this;
        return me.stdout.slice();
    }
    self.consumeStdout = function() {
        var me = this;
        var result = me.getStdout();
        me.stdout = [];
        return result;
    }
    self.hasStdout = function() {
        var me = this;
        return me.stdout.length > 0;
    }
    self.getHistory = function() {
        var me = this;
        return me.history.slice();
    }

}

/**
 * ランタイムコンテキスト
 * 実行時の状態を管理する
 * @param {*} parseCtx 
 */
function RuntimeContext(parseCtx) {
    var self = this;
    self.stack = [];// .length が ESP に相当する
    self.EBP = 0;
    self.LHS = 0;
    self.RHS = 0;
    self.W = 0;
    self.PC = parseCtx.jumpTable["main"];
    self.jumpTable = parseCtx.jumpTable;
    self.scopeContextStack = [new ScopeContext()];
    self.commandSize = parseCtx.callList.length;

    // 標準出力コンソール
    self.console = new Console();

    self.processIsEnd = function() {
        return self.PC >= self.commandSize;
    }
}
