const path = require('path');
const fs = require('fs');
const vm = require('vm');

// テスト対象の src ディレクトリの絶対パス
const sourceDir = path.join(__dirname, '../');

/**
 * srcディレクトリ内のJSファイルを読み込んで実行する（vm内で）
 * @param {string} fileName - 例: "utils.js"
 */
function __include__module(fileName) {
    const fullPath = path.join(sourceDir, fileName);
    const code = fs.readFileSync(fullPath, 'utf-8');
    vm.runInThisContext(code);
}

module.exports = {
    __include__module
};
