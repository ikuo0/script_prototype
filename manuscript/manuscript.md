


# はじめに
本書はスクリプト言語の作り方について解説します。
「スクリプト言語の作り方」は「ソースコードテキストをアセンブラのような構造配列に変換する」ことです、この説明だけで察しがついた方は本書を読む必要は無いと思います。
何を言っているか理解できなかった方は本書を読む価値があるかもしれません。

## スクリプト言語を作る理由
既に Python や JavaScript と行った便利な言語がありライブラリも充実してますので作る理由は無いと思います、「楽しいから」とか「興味がある」といった実益に直結しない理由になるかと思います。<br>
SQLや KQL / Azure Data Explorer のようなDSL（ドメイン特化言語）の開発であれば仕事で必要に迫られる事もあるのかもしれません。

## 前提知識
16進数、if文、for文、関数などといった基本的なプログラムコードの概念が理解できる程度の知識を必要とします、完全な初心者向けではありません。

## 本書の構成
CPU、メモリの仕組みを簡単に説明し、その後は擬似アセンブラの解説に大半を割くことになります。<br>
本書では JavaScript でスクリプト言語を作っていますが、実際に使うスクリプト言語は C/C++、Java 等の動作が高速なコンパイル言語で作ることになるでしょう。
その前段階の試作品を作るためにスクリプト言語でスクリプト言語を作り、仕組みの理解、設計・実装に必要な物を学びます。


## スクリプト言語の作り方概要

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

前述のソースコードを解析して中間言語に変換します。
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

中間言語を専用のロジック（VM）で実行することでスクリプト言語が動作します。<br>
ここで言う「中間言語」とはDATA、LOADLHS などの１番目の単語は関数参照、その後ろは引数という１セット１行が連続している配列です。

「スクリプト言語を作る」手法とは「ソースコード」を「中間言語」に変換する事です。
冒頭で「アセンブラのようなコマンド配列」と書いた物は「中間言語」と呼びます。

- 中間言語
  - 「アセンブラのようなコマンド配列」などと解説されている物は今後「中間言語」と表現します
- VM
  - Virtual Machineの略で中間言語を実行するロジックの事を指します

# CPUの仕組み
アセンブラの仕組みを知る前にCPUの仕組みを知る必要があります。
CPUの仕組みを簡単に解説します、わかりやすさのため実際のCPUには無い疑似命令を使用しています。

## CPUでプログラムを実行するとは？

CPUがプログラムを実行する流れを解説します、ここでは **プログラムカウンタ（PC）という概念を** 学習します。

CPU と 1KB のメモリがあることを想像してください
メモリは巨大な１次元配列で 0x0000～0x03ff の範囲があり、指定したアドレスのデータを読み書きできます。

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
  - 2. `プログラムカウンタ` と同値の `メモリアドレス` から命令を読み込む
  - 3. 読み込んだ命令を実行する
    - 4. 命令が `END` 命令であれば処理を終了しCPUを停止する
  - 5. `プログラムカウンタ（PC）` に１を加算する
  - 6. `処理 2.` に戻り同様の処理を繰り返す

このようにCPUはあるアドレスから命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して...　と繰り返してプログラムを動作させます。<br>

> 実際の CPU の PC は＋１ではありません、MOV等の命令毎に加算バイト数が設定されており２バイト～４バイト以上PCに加算されます。

### 動作例１　CPUがプログラムを実行した結果
「表１　命令サンプル」のメモリ状態でCPUを起動し「動作定義１」に従い動作した場合の実行結果<br>

|実行内容|
|-|
|0x0000 を読み出したCPUは PRINT "Hello" を実行します|
|0x0001 を読み出したCPUは PRINT " World" を実行します|
|0x0002 を読み出したCPUは PRINT "!" を実行します|
|0x0003 を読み出したCPUは END を実行します|

結果として CPU は `Hello World!` と出力して停止します

本来の CPU は四則演算やメモリ間データコピーといった単純な命令しか実行できません、 CPU の動作説明をするため PRINT といった存在しない命令で例えています。

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
|0x0000| を読み出したCPUは PRINT "Hello" を実行します|
|0x0001| を読み出したCPUは PRINT " World" を実行します|
|0x0002| を読み出したCPUは PRINT "!" を実行します|
|0x0003| を読み出したCPUは JMP 0x0000 を実行、PC に 0x0000 が設定される|
|...| PC が変更されたためアドレス加算ではなく 0x0000 にジャンプする|
|**0x0000**| を読み出したCPUは PRINT "Hello" を実行します|
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
CPU はレジスタ同士の演算しかできません、そこでメモリに配置した数値をレジスタにコピーし、結果をメモリ上にコピーするという手順になります。<br>
※一部CPUでは メモリ⇔レジスタ の計算が可能です。


### CPU は直接メモリ間の数値を計算できない

```
answer = 1 + 2
```

全てのCPUが加算命令 `ADD` を持っていますが、メモリ上に配置した値同士を足し算することはできません。

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
それぞれ次のような意味です。
- LHS = 左辺値という意味で a + b の a を指します、Left Hand Side の略です
- RHS = 右辺値という意味で a + b の b を指します、Right Hand Side の略です

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
これらの条件で「疑似アセンブラ」を実行すると最終的に LHSレジスタに 3 が格納され足し算を完了します。<br>

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

### 回答専用レジスタを準備しない理由

回答を ANS(Answer)レジスタとせず LHSレジスタにしている理由はｎ項の演算が続く場合を想定した仕様です、 `a + b + c` とする時に ANSレジスタを実装した場合のコードです。<br>

``` text
MOV %LHS @a; LHS レジスタに a の値をコピー
MOV %RHS @b; RHS レジスタに b の値をコピー
ADD; ANS に a + b の結果が設定される
STOREANS tmp; 変数 tmp に ANS レジスタの値をコピー
MOV %LHS @tmp; LHS レジスタに tmp の値をコピー
MOV %RHS @c; RHS レジスタに c の値をコピー
ADD; ANS に (a + b) + c の結果が設定される
```

次に答えを LHSレジスタに設定する場合のコードです。<br>

``` text
MOV %LHS @a; LHS レジスタに a の値をコピー
MOV %RHS @b; RHS レジスタに b の値をコピー
ADD; LHS に a + b の結果が設定される
MOV %RHS @c; RHS レジスタに c の値をコピー
ADD; LHS に (a + b) + c の結果が設定される
```

このように演算を行うステップ数が減ります、そのため回答ようレジスタ（ANS）を用意せず、LHSを上書きする形で計算結果を保存しています。

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
好きなように変数を行き来して好きなように計算式を書けると便利ではあるのですが、機能・インターフェースを統一することで構文解析時に間違いが起きづらく作りやすいという理由があります。


# ここまでの内容で動作するコードを作ってみる

ここまでの項で次の概念を学びました

- プログラムカウンタ（PC）によるCPU実行の仕組み
- レジスタによる演算

この２つの概念理解ででスクリプト言語を作るための材料はある程度揃いました、メモリ空間を表す１次元配列を作成し、プログラムカウンタ（PC）はその配列のインデックスと置き換えて考えます。<br>
演算はレジスタ間計算として実装し、レジスタ概念への変数コピー命令も実装すれば良いでしょう、基本的にスクリプト言語は高級言語で実装するためアセンブラのようなメモリアドレスも考える必要はありません。<br>
if、forの分岐やループはプログラムカウンタ（１次元配列のインデックス）を操作することで再現できそうです。<br>
`スタック` というとても重要な概念もあるのですが、それは後の項で解説します。

## 中間言語を作る
今まで解説した材料で実際に動作する実行可能な中間言語を作ってみます、実際のスクリプト言語からの変換は処理が重たくソースコードが長くなるため、配列に直接命令や引数を配置する手法で作っていきます。<br>

次のスクリプトを想定し、その中間言語を実行するプログラムを実装します。

```
    VAR A 1; 変数 A を宣言し 1 を設定する
    VAR B 2; 変数 B を宣言し 2 を設定する
    VAR C 0; 変数 c を宣言し 0 を設定する
    MATH_ADD C A B; 変数 C に A + B の結果を設定する
    PRINT C; 計算結果を出力
```

このようなスクリプト言語を想定し中間言語を実装していきます、`VAR A = 1` のほうが分かりやすいのに `VAR A 1` として演算子を省く理由ですが `テキスト解析処理が楽だから` です、＝ や ＋ 演算子の処理は結構手間がかかりますが、半角空白区切りで表現する言語形態だと `source_code.split(/\s+/)` で解析できるため非常に楽です。<br>
最小限のコード量でわかりやすく解説したいので解析コストの低いスクリプトフォーマットにしています。<br>

### 中間言語に必要な命令を考える

見えている部分だけで考えます

- VAR A 1; 変数 A を宣言し 1 を設定する
  - 数字をシンボルに保存、いわゆる `変数` の概念が必要
- MATH_ADD C A B; 変数 C に A + B の結果を設定する
  - 足し算する機能が必要
- PRINT C; 計算結果を出力
  - 変数やレジスタの内容を確認する手段が必要

見えていない部分も考えます

- 足し算機能とは？
  - レジスタ同士で足し算すれば良い
    - レジスタに変数から数値をコピーする命令が必要
- 計算結果をどう扱うか
  - レジスタの値を変数にコピーする命令が必要
- 出力をどう考えるか
  - デバッグしたい
    - 変数の値を出力する機能が必要
    - レジスタの値を出力する機能が必要
  - デバッグ時に目印を出力したい
    - 文字列を出力する機能が必要

### 中間言語の具体的な命令仕様を考える

前項より次の命令仕様を考えます。<br>

- VAR A 1; 変数 A を宣言し 1 を設定する
  - 数字をシンボルに保存、いわゆる `変数` の概念が必要
    - `DATA a 1` = シンボル a に 1 を設定し、 a で参照できるようにする
- MATH_ADD C A B; 変数 C に A + B の結果を設定する
  - 足し算する機能が必要
    - `ADD` レジスタ間の足し算の結果をレジスタに設定する
- PRINT C; 計算結果を出力
  - 変数やレジスタの内容を確認する手段が必要
    - `PRINT_STR "文字列"` = 引数の文字列を出力する
- 足し算機能とは？
  - レジスタの値で足し算する
    - `LHSレジスタ、RHSレジスタ` を作り、足し算の結果は `LHSレジスタ` に格納する
      - レジスタに数値を変数からコピーする命令が必要
        - `LOADLHS a` = シンボル a の値を `LHSレジスタ` に設定する
        - `LOADRHS b` = シンボル b の値を `RHSレジスタ` に設定する
  - LHS、RHSを設定した状態で `ADD` を実行したら `LHSレジスタ` に LHS + RHS の値を設定する
      
- 計算結果をどう扱うか
  - レジスタの値を変数にコピーする命令が必要
    - `STORELHS C` = シンボル C に `LHSレジスタ` の値を設定する
- 出力をどう考えるか
  - デバッグしたい
    - 変数の値を出力する機能が必要
      - `PRINT_VAR a` = シンボル a の値を出力する
    - レジスタの値を出力する機能が必要
      - `PRINT_REG LHS` = レジスタ LHS の値を出力する
  - デバッグ時に目印を出力したい
    - 文字列を出力する機能が必要
      - `PRINT_STR "文字列"` = 引数の文字列を出力する

### 中間言語、命令一覧

前項までの事を考慮し作成したのが、次に示す命令一覧です

| 命令名         | 引数                         | 説明                                               | 動作内容                                                                 |
|----------------|------------------------------|----------------------------------------------------|--------------------------------------------------------------------------|
| DATA           | 変数名, 初期値               | 変数を作成して初期値を代入する                     | `variable[変数名] = 初期値`                                              |
| LOADLHS        | 変数名                       | 指定した変数の値を LHS レジスタに読み込む          | `LHS = variable[変数名]`                                                 |
| LOADRHS        | 変数名                       | 指定した変数の値を RHS レジスタに読み込む          | `RHS = variable[変数名]`                                                 |
| STORELHS       | 変数名                       | LHS の値を指定した変数に保存する                   | `variable[変数名] = LHS`                                                 |
| ADD            | なし                         | LHS に RHS の値を加算し、結果を LHS に保存         | `LHS = LHS + RHS`                                                        |
| PRINT_REG      | レジスタ名（LHS または RHS） | 指定したレジスタの値を出力する                     | `console.log(LHS または RHS)`                                            |
| PRINT_VAR      | 変数名                       | 指定した変数の値を出力する                         | `console.log(variable[変数名])`                                          |
| PRINT_STR      | 文字列                       | 指定した文字列をそのまま出力する                   | `console.log("文字列")`                                                  |

### 中間言語を作る

これを今まで学習した概念で中間言語にすると次のようになります。<br>
表の１行をメモリ空間のアドレス１つとして捉え行番号＝アドレスだと考えます。<br>
処理は１行目から開始され、２行目、３行目と１行ずつ逐次実行されていきます。<br>

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


では、この表に従い JavaScript を実装していきます、主処理部分だけ抜粋すると次のようになります。

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
        operation[0](runtimeCtx, operation.slice(1));
        runtimeCtx.PC += 1;
    }
}

execute();
```

`operations_list` の部分が中間言語であり、冒頭で出てきた `「アセンブラのようなコマンド配列」` とはこれを指しています。<br>
繰り返しになりますが `「スクリプト言語を作る」` とは文字列を解析して `「アセンブラのようなコマンド配列」（中間言語）` を作ることです。<br>
このコードを見て「簡単だ」と思った方もいるかと思います、その通りでここだけ見ると非常に簡単です、この辺の仕組みさえ分かってしまえば後は `テキストの解析（おパース処理）` ができてしまえば自作言語作成はできてしまいます。<br>
そしてその `テキストの解析（おパース処理）` が面倒なのです、著者の感想ですが `「難しい」` というよりかは `「面倒」` です。<br>
ソースコードを掲載しますので実際に実行し動作を見てみましょう。

### プログラム全体

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

```

# 一旦区切り
「スクリプト言語を作る」とは、「中間言語」への変換器を作ることです。<br>
その目的となる 中間言語 について、ここまでで基本的な解説はひと通り終えました。<br>
理解があいまいな部分があれば、再度読み直したりソースコードを書き換えたりして、機能を追加するなどの工夫をしてみてください。<br>

この先の内容を理解するためには `プログラムカウンタの仕組み` を理解することが重要です。<br>

> プログラムカウンタ（PC）＝メモリアドレス。プログラムカウンタが指すアドレスから命令やデータを読み出し、処理が実行される。

本書だけでピンと来なかった場合は、検索やAIなどを活用して、別の視点から調べるのも良いと思います。<br>



# 残りの課題
プログラムカウンタの仕組みが理解できないと次項以降が理解できません、そのため以下の機能はあえて解説せず後回しとしました。<br>
以下については後の項で解説していきます。<br>

- 分岐処理（if文）

- ループ処理（for文）

- スタック の仕組み

- ユーザー定義関数

- テキスト解析（← 実装量が多く、開発コストも高い部分です）


# 用語の統一

残りの課題を読む前に、以降の解説で使用する用語を統一します、これまでは実際のCPUと中間言語と中間言語実行のVMと混ざった状態で解説していましたが、この先はスクリプト言語開発が主役であり、CPUやアセンブラの話はほぼ出てきませんので、用語の目的を限定します。

## 中間言語

次のような「命令参照、引数１、引数２、...」という配列の配列を 「**`中間言語`**」 とします。

```javascript
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
```

## PC
**`PC`** はプログラムカウンタの事を指し、 **`中間言語`** の文脈で出てきた時は **`中間言語配列のインデックス`** の事を指します。<br>
次のコードを題材に `PC が 3 の場所～` という文章であれば `[Operations.LOADLHS, 'A'],` の箇所を指しているという意味になります。

```javascript
    var operations_list = [
        [Operations.DATA, 'A', 1], // PC = 0
        [Operations.DATA, 'B', 2], // PC = 1
        [Operations.DATA, 'C', 0], // PC = 2
        [Operations.LOADLHS, 'A'], // PC = 3
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
```

## レジスタ
以降の文章で出てくる **`レジスタ`** は中間言語、又は中間言語を実行するVMのランタイム変数の事を指します、本当のCPUのレジスタの事ではありません。<br>
次のコードの `RuntimeContext の 英大文字で宣言された変数のことを指します` 。<br>

``` javascript
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
    self.PC = 0; // レジスタ（PC）
    self.LHS = 0; // レジスタ（左辺値・回答レジスタ）
    self.RHS = 0; // レジスタ（右辺値レジスタ）
    self.variable = {}; // レジスタではない
}
```

# 分岐処理（if文）

## プログラムカウンタ(PC)のおさらい

次の中間言語を実行します。

|PC|命令|
|-|-|
|0|PRINT "AAA"|
|1|PRINT "BBB"|
|2|PRINT "CCC"|
|3|PRINT "DDD"|
|4|PRINT "EEE"|
|5|PRINT "FFF"|

モニタには次のように表示されます。

```
AAA
BBB
CCC
DDD
EEE
FFF
```

PCは0から実行開始し、命令を実行するたびに１加算され次を実行します。<br>
- PC=0 の時 PRINT "AAA" が実行されます
- 実行終了後 PC は 1 加算される
- PC=1 の時 PRINT "BBB" が実行されます
- 実行終了後 PC は 1 加算される
- PC=2 の時...

と実行されます。<br>


## PC を変更する命令 JMP を定義する
PC を指定した値に変更する `JMP` という命令を定義します。<br>

使い方は `JMP [PC の値]` です。<br>
次の中間言語を実行します。<br>

|PC|命令|処理|
|-|-|-|
|0|PRINT "AAA"|"AAA" と表示|
|1|**`JMP 4`**|PCに4を設定、次は PC=4 の箇所から実行される|
|2|PRINT "BBB"|実行されず|
|3|PRINT "CCC"|実行されず|
|**4**|**PRINT "DDD"**|**PC=2, 3 を飛ばして "DDD" と表示**|
|5|PRINT "EEE"|"EEE" と表示|
|6|PRINT "FFF"|"FFF" と表示|

モニタには次のように表示されます。

```
AAA
DDD
EEE
FFF
```

- `PRINT "BBB", PRINT "CCC"` の箇所をIF文の真
- `PRINT "EEE", PRINT "FFF"` の箇所をIF文の偽（ELSE）
と考えると、分岐（if文）の実装ができそうだなと思いませんか？

## 条件付きでジャンプする命令を定義する
分岐は中間言語に次の命令を実装することで実装します、PCの値を直接指定する形式だと都合が悪いので、`ラベル名` でジャンプするPCを指定できるようにします。<br>
ラベル名をPCに置き換える処理はスクリプト解析時、又はVM実行時に行います。


|命令名|機能|構文|
|-|-|-|
|JZ|LHSレジスタの値が 0 だったら指定ラベル（インデックス）にジャンプ|`JZ end_if`|
|JNZ|LHSレジスタの値が 1(非0) だったら指定ラベル（インデックス）にジャンプ|`JNZ end_if`|

JZ は Jump Zero の略で、比較結果（演算結果）が 0 だったらジャンプせよという命令です。<br>
JNZ は Jump Not Zero の略で、比較結果（演算結果）が 0 以外だったらジャンプせよという命令です。<br>
**分岐（if 文）の実装は基本的に `JZ` を使います。**<br>

## 何故 if分岐に JZ なのか

直感的には JNZ で実装できそうですね。<br>
JNZは次のように解説しました。<br>

> LHSレジスタの値が 1(非0) だったら指定ラベル（インデックス）にジャンプ

if文の直感的理解は `真であれば分岐せよ` ですから、当然 真（!=0） で分岐する JNZ を分岐に使うように思います。<br>
しかし、PCの `インクリメントして逐次実行する` というルールを利用して分岐する場合に、偽（=0）で分岐したほうが都合が良いので JZ で分岐を作ります。<br>

## 中間言語作成

次のスクリプトをビルドすることを想定します。

```
if 5 > 3 {
  print("a is greater")
}
```

ビルド後の中間言語

|インデックス|命令|処理|
|-|-|-|
|0|DATA a 5|変数 a に 5 を代入|
|1|DATA b 3|変数 b に 3 を代入|
|2|LOADLHS @a|変数 a を LHSレジスタに設定|
|3|LOADRHS @b|変数 b を RHSレジスタに設定|
|4|GT|LHSレジスタとRHSレジスタの比較結果をLHSレジスタに格納する|
|5|JZ end_if|LHSレジスタの値が 0 だったら end_if にジャンプ|
|6|PRINT "a is greater"|モニタに "a is greater" と表示|
|7|EXIT|プログラムを終了する|

`GT` は LHSレジスタ ＞ RHSレジスタ の比較結果が真であれば LHSレジスタに 1 を設定、偽であれば LHSレジスタに 0 を設定する命令です。<br>


この中間言語は以下のジャンプテーブルを使用します。<br>

``` json
{
  "end_if": 7
}
```

if文なのに比較結果が FALSE（0）だったら、というジャンプをしているので混乱するかもしれません。<br>
<br>
TRUE(非0)だった場合で考えます。<br>
**PC=5 の位置で LHS=非0 ですから、`JZ end_if` ではなにも起きず、次の PC=6 が実行されモニタには "a is greater" が表示されます。**<br>
<br>
FALSE(0)だった場合で考えます。<br>
**PC=5 の位置で LHS=0 ですから、`JZ end_if` の条件でトリガーされ、`end_if ラベル` の値である 7 を使い PC=7 となり PC=6 はスキップされ処理はそのまま終了します**<br>

という動作をしますので想定通り if true による分岐が実装できます。<br>


## JNZ を使った分岐の中間言語

先ほど同様に次のスクリプトをビルドすることを想定します。<br>
今回は JZ ではなく JNZ を使って分岐を実装します。

```
if 5 > 3 {
  print("a is greater")
}
```
中間言語

| インデックス | 命令                                 | 処理内容                                        |
|--------------|--------------------------------------|-------------------------------------------------|
| 0            | DATA a 5                             | 変数 a に 5 を代入                              |
| 1            | DATA b 3                             | 変数 b に 3 を代入                              |
| 2            | LOADLHS @a                           | a を LHSレジスタにロード                        |
| 3            | LOADRHS @b                           | b を RHSレジスタにロード                        |
| 4            | CMP_GREATER                          | LHS ← (a > b) の結果                            |
| 5            | JNZ do_print                         | LHS ≠ 0 の場合、do_print へジャンプ            |
| 6            | JMP end_if                           | 条件が偽なら end_if へスキップ                 |
| 7            | do_print: PRINT "a is greater"       | 条件成立時に出力                               |
| 8            | end_if: EXIT                         | プログラム終了                                 |


ジャンプテーブル

```
{
  "do_print": 7,
  "end_if": 8
}
```

大なり比較の結果が真であった場合 PC=5 の JNZ により do_printラベル（PC=7） にジャンプし、<br>
大なり比較の結果が偽であった場合 PC=5 の JNZ ではなにも実行されず次の PC=6 の `JMP end_if` が実行され PRINT 命令はスキップされます。


JZ で分岐するのは、アセンブラにおいて一般的な手法であるという大前提があります。<br>
JNZ を使った分岐に比べると、JZ を使った分岐の方が命令数が少なく、ジャンプラベルもひとつ少なくて済みます。<br>
こうした構造は、コードの複雑さやメモリコストを削減することに繋がります。<br>
<br>
これからスクリプト言語を設計しようとする場合、どちらのルールを採用するかは自由に決めることができます。<br>
もちろん **「実装できればそれで良い」** という考え方もありますが、一般的なアセンブラが JZ による分岐を採用しているという事実を踏まえると、それに倣うほうが自然であり、他の開発者にとっても直感的に理解しやすい設計になるのではないかと思います。<br>

## if分岐の実装

中間言語部分の抜粋です。<br>
新たに `GT` 命令、 `JZ` 命令が追加されています。<br>

|命令名|機能|構文|
|-|-|-|
|JZ|LHSレジスタの値が 0 だったら指定ラベル（インデックス）にジャンプ|`JZ end_if`|
|GT|LHSレジスタとRHSレジスタを比較しLHSレジスタが大きければLHSレジスタに1を設定、それ以外は0を設定する|`GT` ※事前にLHS、RHSを設定する|

``` javascript
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
        [Operations.PRINT_STR, "A is greater B"], // 7: print("A is greater 0")
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
```

### ソースコード全体
if分岐のソースコード全体です。<br>

``` javascript

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

```

# ループ処理（for文）

# スタック の仕組み

# ユーザー定義関数

# テキスト解析（← 実装量が多く、開発コストも高い部分です）





