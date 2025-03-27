
/**
 * 配列クラスに extend メソッドを追加
 * @param {any[]} array 
 */
Array.prototype.extend = function (array) {
    array.forEach(function (value) {
        this.push(value);
    }, this);
}

function test1() {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    a.extend(b);
    console.log(a); // [1, 2, 3, 4, 5, 6]
}

function Context() {
    var self = this;
    self.array1 = [];
    self.array2 = [];
    // array2 に extend を上書き実装する
    self.array2.extend = function (array) {
        console.log("### call extend2 ###");
        array.forEach(function (value) {
            this.push("* " + value);
        }, this);
    }
}

function test2() {
    var ctx = new Context();
    ctx.array1 = [1, 2, 3];
    ctx.array2.extend([4, 5, 6]);
    ctx.array2.extend(ctx.array1);
    console.log(ctx.array2); // ["* 4", "* 5", "* 6", "* 1", "* 2", "* 3"]
}

test1();
test2();


