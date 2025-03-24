
var is_node_environment = (typeof describe !== 'undefined' && typeof require !== 'undefined');

/**
 * 指定された配列のすべての要素を現在の配列に追加します。
 *
 * @template T
 * @this {T[]}
 * @param {T[]} items - 現在の配列に追加する要素の配列
 * @returns {void}
 */
Array.prototype.extend = function(items) {
    Array.prototype.push.apply(this, items);
};

/**
 * 配列末尾から n番目の要素を取得する関数。
 * @template T
 * @this {T[]}
 * @param {number} index
 * @returns {T}
 */
Array.prototype.tail = function(index) {
    return this[this.length - (index + 1)];
};

/**
 * 配列末尾から n個の要素を削除する関数。
 * @param {*} n 
 */
Array.prototype.drop = function(n) {
    this.splice(-n, n); // 末尾から n 個削除
};

/**
 * JavaScriptプログラムを終了させる
 * 存在しない関数を呼び出しエラー終了させる
 */
var exit = null;
if(is_node_environment) {
    exit = function exit() {
        process.exit(1);
    }
} else {
    exit = function exit() {
        throw new Error("Script terminated (browser)");
    }
}

/**
 * エラーメッセージを表示してプログラムを終了する
 * @param {*} message 表示文字列
 */
function error(message) {
    console.log("#### ERROR ####");
    console.log(message);
    var stackString = (new Error()).stack;
    var errorMessage = [
        "エラー発生",
        message,
        stackString
    ].join("\n");
    throw new Error(errorMessage);
}

/**
 * 文字列が数値変換可能かどうか判定する
 * @param {*} str 判定対象文字列
 * @returns 判定可能であれば true、それ以外は false
 */
function isNumeric(str) {
    return !isNaN(str) && str.trim() !== "";
}

/**
 * 文字列が関数名や変数名として使用可能かを判定する、IDENTITYかを判断する
 * @param {*} value 
 * @returns 
 */
function isIdentity(value) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Enum関数
 * @param {*} start 
 * @returns 
 */
function Enum(start = 1) {
    if (!Enum.counter) {
        Enum.counter = start;
    }
    return Enum.counter++;
}
