


# はじめに
本書はスクリプト言語の作り方について解説します。
「スクリプト言語の作り方」は「ソースコードテキストをアセンブラのような構造配列に変換する」ことです、この説明だけで察しがついた方は本書を読む必要は無いと思います。
何を言っているか理解できなかった方は本書を読む価値があるかもしれません。

## スクリプト言語を作る理由
既に Python や JavaScript と行った便利な言語がありライブラリも充実してますので作る理由は無いと思います、「楽しいから」とか「興味がある」といった実益に直結しない理由になるかと思います。<br>
SQLや KQL / Azure Data Explorer のようなDSL（ドメイン特化言語）であれば仕事で必要に迫られる事もなくはないのかもしれません。

## 前提知識
16進数、if文、for文、関数などといった基本的なプログラムコードの概念を理解している程度の知識を必要とします、完全な初心者向けではありません。

## 本書の構成
CUP、メモリの仕組みを簡単に説明し、その後擬似アセンブラの解説に大半を割くことになります。<br>
本書ではJavaScriptでスクリプト言語を作っていますが、実際に使うスクリプト言語は C/C++、Java 等の動作が高速なコンパイル言語で作ることになるでしょう。
その前段階の試作品を作るためにスクリプト言語でスクリプト言語を作り仕組みの理解、設計・実装に必要な物を学びます。

## 本書の手法は正しいか？
一般的なスクリプト言語設計だとは思います、最適解である自信は無いですがチューリング完全な言語を作れる手法の解説書であることは間違いありません。

## 具体的なスクリプト言語の作り方

先に結論となる変換処理の概要を記載します。

以下のようなスクリプト言語のソースコードを仮定します。
```
MAIN
  DATA a 1; 変数 a に 1 を代入する
  IF a; 変数 a がTRUE(非0)であるかを判定し、TRUE(非0)であれば IF ～ END_IF の間のコードを実行する
    PRINT "a is not 0"
  END_IF
END_MAIN
```

前述のソースコードをコマンド配列に変換します。
```
0, DATA, @a, 1          ; 変数 a に 1 を代入
1, LOADLHS, @a          ; LHSレジスタ に a の内容をコピー
2, LOADRHS, 1           ; RHSレジスタ に 1 を設定
3, EQ                   ; LHSレジスタ と RHSレジスタを比較し、その結果を LHSレジスタに格納
4, JZ, end_if_or_else_0 ; LHSレジスタが 0 だったら ラベル end_if_or_else_0 にジャンプする
5, PRINT, *a is not 0   ; "a is not 0" と出力する
6, EXIT                 ; プログラムの終了

; ジャンプテーブル、JZ等のジャンプ系命令で使用される
{
  "main": 0,
  "end_if_or_else_0": 6
}
```

コマンド配列を専用のVMで実行することでスクリプト言語が動作します。

「スクリプト言語を作る」手法とは「ソースコード」を「アセンブラのようなコマンド配列」に変換する事です。
次項から「アセンブラのようなコマンド配列」が何者かを説明していきます。

# CPUの仕組み
アセンブラの仕組みを知る前にCPUの仕組みを知る必要があります。
CPUの仕組みを簡単に解説します、わかりやすさのため実際のCPUには無い疑似命令を使用しています。

## CPUでプログラムを実行するとは？

CPUがプログラムを実行する流れを解説します。

CPU と 1KB のメモリがあることを想像してください
メモリは巨大な１次元配列で 0x0000～0x03ff の範があり、指定したアドレスのデータを読み書きできます。

0x0000 に A と書き込んで<br>
0x0000 のデータを読み取ると A が取得できます

0x0123 に 999 と書き込んで<br>
0x0123 のデータを読み取ると 999 が取得できます

メモリとは指定したアドレス(この場合0x0000～0x03ff)に対して書き込んだり、書き込まれた値を読み込むといったやりとりができる記憶領域です。

メモリにはデータだけでなく `あるアドレスに 0x01 と書き込まれていたら変数処理をする` という命令も書き込まれています。

### 表１　命令サンプル
メモリには下記のように命令（プログラム）が書き込んであるとします

|メモリアドレス|書き込んである命令|
|-|-|
|0x0000 |PRINT "Hello"|
|0x0001 |PRINT " World"|
|0x0002 |PRINT "!"|
|0x0003 |END|

`PRINT` はモニタに指定した文字列を出力する命令とする
`END` は処理を終了し、CPUを停止させる命令とする


### 動作定義１　CPUは以下の動作をする
- 1. CPU に電源を投入し起動すると `プログラムカウンタ（PC）` に 0x0000 が設定されます
  - 2. `プログラムカウンタ` を `メモリアドレス` としてメモリから命令を読み込む
  - 3. 読み込んだ命令を実行する
    - 4. 命令が `END` 命令であれば処理を終了しCPUを停止する
  - 5. `プログラムカウンタ（PC）` に１を加算する
  - 6. `処理 2.` に戻り同様の処理を繰り返す

このようにCPUはあるアドレスから命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して...　と繰り返してプログラムを動作させます。

### 動作例１　CPUがプログラムを実行した結果
「表１　命令サンプル」のメモリ状態でCPUを起動し「動作定義１」に従い動作した場合の実行結果<br>

|実行内容|
|-|
|0x0000 を読み出したCPUは PRINT "Hello" を実行します|
|0x0001 を読み出したCPUは PRINT " World" を実行します|
|0x0002 を読み出したCPUは PRINT "!" を実行します|
|0x0003 を読み出したCPUは END を実行します|

結果として CPU は `Hello World!` と出力して停止します

本来のCPUは四則演算やメモリ間データコピーといった単純な命令しか実行できません、CPUの動作説明をするため PRINT といった存在しない命令で例えています。

## ジャンプ命令によるプログラムカウンタの設定

プログラムカウンタ（PC）を編集することで、参照するアドレスを一方に増やすだけでなくループすることができます

### 表１　命令サンプル
メモリには下記のように命令（プログラム）が書き込んであるとします

|メモリアドレス|書き込んである命令|
|-|-|
|0x0000 |PRINT "Hello"|
|0x0001 |PRINT " World"|
|0x0002 |PRINT "!"|
|0x0003 | **JMP** 0x0000|

`JMP` はプログラムカウンタ（PC）の値を任意に設定できる命令とします。

### 動作例１　CPUがプログラムを実行した結果
「表１　命令サンプル」のメモリ状態でCPUを起動し「動作定義１」に従い動作した場合の実行結果<br>

|アドレス|実行内容|
|-|-|
|0x0000| を読み出したCPUは PRINT "Hello" を実行します、実行|
|0x0001| を読み出したCPUは PRINT " World" を実行します|
|0x0002| を読み出したCPUは PRINT "!" を実行します|
|0x0003| を読み出したCPUは JMP 0x0000 を実行、PC に 0x0000 が設定される|
|...| PC が変更されたためアドレス加算ではなく 0x0000 にジャンプする|
|**0x0000**| を読み出したCPUは PRINT "Hello" を実行します、実行|
|0x0001| を読み出したCPUは PRINT " World" を実行します|
|0x0002| を読み出したCPUは PRINT "!" を実行します|
|0x0003| を読み出したCPUは JMP 0x0000 を実行、PC に 0x0000 が設定される|
|...| 以降 0x0000～0x0003 を繰り返し実行する|

結果として CPU は 
```
Hello World!Hello World!Hello World!Hello World!Hello World!...
```
と出力し続けます

プログラム言語は `プログラムカウンタ（PC）を編集することで if文 や forループ といったものを実現しています` 、実際の if文 や for文 については後の項目で解説します。



## まとめ
- CPUはアドレスを順番に読み込んで命令を実行する
- プログラムカウンタ(PC)を設定することでアドレスジャンプができる


# レジスタとは何者か
CPU にはレジスタという一時的な記憶領域があり、これはPICやマイコンと呼ばれる物も含めて全てのCPUが持つ記憶領域です。

## レジスタの使い方
CPU はレジスタ同士の演算しかできません、そこでメモリに配置した数字をレジスタにコピーし、結果をメモリ上にコピーするという手順になります。<br>
一部アセンブラでは メモリ・レジスタ の計算は可能です。


### CPU は直接メモリ間の数値を計算できない

```
answer = 1 + 2
```

この計算をCPUに計算させたい時にあるメモリ領域に情報を書き込みそれらを加算するという命令(`ADD`)を実行することを考えます。

|メモリアドレス|値|
|-|-|
|0x0000|1|
|0x0001|2|

このようにメモリに値を配置し<br>
 `ADD 0x0000 0x0001` <br>
とはできないのです。<br>

### アセンブラで足し算する手順
以下の疑似アセンブラで足し算の例を実装します。<br>
この世界では `LHS, RHS というレジスタが存在する` ことにします。<br>

```
; 疑似アセンブラ
; @X は変数参照とする
; %X はレジスタ参照とする
DATA a 1; シンボル a に 1 を設定
DATA b 2; シンボル b に 2 を設定
DATA answer 0; シンボル answer に 0 を設定
MOV %LHS @a; %LHS レジスタに a の値をコピー
MOV %RHS @b; %RHS レジスタに b の値をコピー
ADD; LHSレジスタ と RHSレジスタ を加算した結果を LHSレジスタに格納する
MOV @answer %LHS; 計算結果を変数 answer にコピー
END; プログラムを終了する
```

`'DATA' は 適当なアドレスに領域を確保し、そのアドレスをシンボルで参照できるようにする命令` <br>
`'MOV' はレジスタ～シンボル（変数）の間でデータコピーする命令`<br>
`'ADD' は LHSレジスタ と RHSレジスタ を加算した値を LHSレジスタに設定する命令`

とします。<br>
これらの条件で「疑似アセンブラ」を実行すると最終的に LHSレジスタに 3 が格納され足し算を完了します。

このアセンブラをコンパイルしメモリに展開するとおおむね下記のようなメモリ配置になります。

|メモリアドレス|値/命令|
|-|-|
|0x0000|MOV LHS a(アドレス 0x0100 の参照)|
|0x0001|MOV RHS b(アドレス 0x0101 の参照)|
|0x0002|ADD|
|0x0003|MOV @answer %LHS|
|0x0004|END|
|～省略～|～|
|0x0100|1|
|0x0101|2|
|0x0102|0（プログラム実行後は 3 に設定される）|

`DATA a 1` という命令は 0x0100 に 1 を配置し、コード内の a というシンボルは全てアドレスの 0x0100 参照に変換されます。<br>
`DATA b 2` という命令は 0x0101 に 2 を配置し、コード内の b というシンボルは全てアドレスの 0x0101 参照に変換されます。<br>
answer も同様に処理され answer というシンボルで 0x0102 に参照できるようになります。

### 実際のアドレスとPCと命令の関係
「疑似アセンブラ」であると断りをいれていますが、誤ったアセンブラ知識にならないよう注釈です。<br>
前項までにメモリ空間に命令を配置し疑似アセンブラを解説してきましたが、実際のバイトコードでは PC は毎回 +1 されるわけではなく、命令とオプションのバイト数分だけ加算されます。<br>
例えば `MOV LHS a(0x0100参照)` という命令は次の表のように配置されます。

|メモリアドレス|値/命令|
|-|-|
|0x0000|MOV|
|0x0001|LHS|
|0x0002|0x0100|
|-|実行後に P Cは +3 される|

毎フレーム（毎クロック）  +1 ずつ動くわけではなく、命令毎にPCの加算値が決まっており、その値に従って PC が加算されます。<br>
この本来的なメモリ配置で解説していくと手間がかかるため、都合の良い解釈をしやすい疑似アセンブラによる解説を行っています。

## CPUにレジスタが必要な理由
推測になります。<br>
CPU設計をシンプルに保つため、動作クロック（処理時間）安定のためあたりが理由だと思います。<br>
メモリの配置されている場所（L1～L3）によっては数クロック～数十クロックの時間がかかるため常にメモリ間へアクセスするような設計だと処理時間が安定せず他の並列処理等への影響が大きいのだと思います。<br>

## スクリプトでレジスタ概念を再現する理由
レジスタについて解説してきましたが、これから実装するスクリプト言語は `レジスタ概念を再現して実装しています` 。<br>
スクリプト言語の実行にレジスタ概念を持ち込む理由は `汎用的なインターフェースのほうが実装が楽だから` です。<br>
好きなように変数を行き来して好きなように計算式を書けると便利ではあるのですが、機能・インターフェースを統一することで構文解析時に一定の法則さえ守っていれば間違いも起きづらく作りやすいという理由があります。


# ここまでの内容で動作するコードを作ってみる

ここまでの項で次の概念を学びました

- プログラムカウンタ（PC）によるCPU実行の仕組み
- レジスタによる演算

この２つの概念理解ででスクリプト言語を作るための材料はほぼ揃いました、メモリ空間を表す１次元配列を作成し、プログラムカウンタ（PC）はその配列のインデックスと置き換えて考えます。<br>
演算はレジスタ間計算として実装し、レジスタ概念への変数コピー命令も実装すれば良いでしょう、高級言語でスクリプトを作る場合にアドレス直接参照をせず変数シンボル、配列インデックス、辞書型のキーなど、変数アクセスの手段は豊富です。<br>
if、forの分岐やループはプログラムカウンタ（１次元配列のインデックス）を操作することで再現できそうです。<br>
`スタック` というとても重要な概念もあるのですが、それは後の項で解説します。

## 簡単なアセンブラのような言語を作ってみる
今まで解説した材料で実際に動作する実行可能な命令配列を作ってみます、実際のスクリプト言語からの変換は処理が重たくソースコードが長くなるため、配列に直接命令や引数を配置する手法で作っていきます。<br>

次のスクリプトを中間言語に変換し、その中間言語を実行するプログラムを実装します。

```
    VAR A 1; 変数 A を宣言し 1 を設定する
    VAR B 2; 変数 B を宣言し 2 を設定する
    VAR C 0; 変数 c を宣言し 0 を設定する
    MATH_ADD C A B; 変数 C に A + B の結果を設定する
```

このようなスクリプト言語を想定し実装します、`VAR A = 1` でない理由ですが `テキスト解析処理が面倒だから` です、＝ や ＋ 演算子の処理は結構手間がかかります、このような言語形態だと `source_code.split(/\s+/)` で解析できるため非常に楽です。<br>
最小限のコード量でわかりやすく解説したいので解析コストの低いスクリプトを題材にしています。<br>
これを今まで学習した概念で擬似スクリプトにすると次のようになります。<br>
表の１行をメモリ空間のアドレス１つとして捉え行番号＝アドレスだと考えます。

| 行 | 命令         | 引数1 | 引数2 | 説明                                   |
|----|--------------|-------|-------|----------------------------------------|
| 1  | DATA         | A     | 1     | メモリ変数 A に 1 を設定               |
| 2  | DATA         | B     | 2     | メモリ変数 B に 2 を設定               |
| 3  | DATA         | C     | 0     | メモリ変数 C に 0 を設定               |
| 4  | LOADLHS      | A     |       | 変数 A の値をレジスタ LHS に読み込む  |
| 5  | LOADRHS      | B     |       | 変数 B の値をレジスタ RHS に読み込む  |
| 6  | ADD          |       |       | LHS + RHS を計算し、結果を LHS に格納  |
| 7  | STORELHS     | C     |       | LHS の値を変数 C に保存                |
| 8  | PRINT_STR    | C =   |       | 「C = 」という文字列を出力             |
| 9  | PRINT_VAR    | C     |       | 変数 C の値を出力                      |
| 10 | PRINT_STR    | LHS = |       | 「LHS = 」という文字列を出力           |
| 11 | PRINT_REG    | LHS   |       | レジスタ LHS の値を出力                |
| 12 | PRINT_STR    | RHS = |       | 「RHS = 」という文字列を出力           |
| 13 | PRINT_REG    | RHS   |       | レジスタ RHS の値を出力                |


では、この表に従い JavaScript を実装していきます、メイン部分だけ抜粋すると次のようになります。

```javascript
function execute() {
    /*
    汎用的な疑似プログラムコードによる例

    VAR A = 1
    VAR B = 2
    VAR C = 0
    C = A + B


    本書向けにテキスト解析処理が楽なスクリプト言語による例

    VAR A 1; 変数 A を宣言し 1 を設定する
    VAR B 2; 変数 B を宣言し 2 を設定する
    VAR C 0; 変数 c を宣言し 0 を設定する
    MATH_ADD C A B; 変数 C に A + B の結果を設定する

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
        operation[0](runtimeCtx, ...operation.slice(1));
        runtimeCtx.PC += 1;
    }
}

execute();
```

`operations_list` の部分が中間言語であり、冒頭で出てきた `「アセンブラのようなコマンド配列」` になります。<br>
`「スクリプト言語を作る」` とは文字列を解析して `「アセンブラのようなコマンド配列」` を作ることです。<br>
このコードを見て「簡単だ」と思った方もいるかと思います、その通りでここだけ見ると非常に簡単です、この辺の仕組みさえ分かってしまえば後は `テキストの解析（おパース処理）` さえできてしまえば自作言語作成はできてしまいます。<br>
そしてその `テキストの解析（おパース処理）` が面倒なのです、著者の感想ですが `「難しい」` ではなく `「面倒」` です。

## プログラム全体

実際に動くソースコード全体を掲載します。<br>

```javascript
// example1.js

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

```

## 