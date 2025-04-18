


# はじめに
本書ではスクリプト言語の作り方を解説します。<br>
「スクリプト言語の作り方」は『ソースコードテキストを「アセンブラのような構造配列」に変換する』ことです、「アセンブラのような構造配列」の事を「中間言語」と呼びます。<br>
この説明だけで察しがついた方は本書を読む必要は無いと思います。<br>
何を言っているか理解できなかった方は本書を読む価値があるかもしれません。

## スクリプト言語を作る理由はあんまり無い
既に Python や JavaScript と行った便利な言語がありライブラリも充実してますので新たにスクリプト言語を作る理由は無いと思います、「楽しいから」とか「興味がある」といった実益に直結しない理由になるかと思います。<br>
SQLや KQL / Azure Data Explorer のようなDSL（ドメイン特化言語）の開発であれば仕事で必要に迫られる事もあるかもしれませんが稀だと思います。<br>

## 前提知識
16進数、if文、for文、関数などといった基本的なプログラムコードの概念が理解できる程度の知識を必要とします、完全な初心者向けではありません。<br>


## 目指す物
`チューリング完全` なスクリプト言語作成を目指します。<br>
`チューリング完全` とはなんでも計算できるということで、電卓のように一つの計算式だけで完結する物とは異なります。<br>
次の条件を満たせばチューリング完全と言えるでしょう。<br>

- 条件分岐ができる
- 繰り返しができる
- 変数に値を出し入れできる


## 本書の構成
CPU、メモリの仕組みを簡単に説明し、その後は擬似アセンブラ、中間言語の解説に大半を割くことになります。<br>
本書では JavaScript でスクリプト言語を作っていますが、実際にスクリプト言語を作る時は C/C++、Java 等の動作が高速なコンパイル言語で作ることになるでしょう。<br>
その前段階の試作品を作るためにスクリプト言語でスクリプト言語を作り、仕組みの理解、設計・実装に必要な物を学びます。<br>

## スクリプト言語の作り方、雑なゴール解説

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

前述のソースコードを解析して `中間言語` に変換します、次のアセンブラのような命令配列が `中間言語` です。<br>

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

コードのコメントに `レジスタ` とありますが、実際のレジスタでなく概念のレジスタです、実装は通常の変数です。<br>
冒頭にあった `「アセンブラのような構造配列」` とはこの `中間言語` の事を指しています。<br>
中間言語を専用のロジック（VM）で実行することでスクリプト言語が動作します。<br>


「スクリプト言語を作る」とは「ソースコード」を「中間言語」に変換する変換器を作る事です。

- 中間言語
  - 「アセンブラのようなコマンド配列」などと解説されている物は今後「中間言語」と表現します
- VM
  - Virtual Machineの略で中間言語を実行するメインロジックの事を指します


# CPUの仕組み
アセンブラの仕組みを知る前にCPUの仕組みを知る必要があります。
CPUの仕組みを簡単に解説します、わかりやすさのため実際のCPUには無い疑似命令を使用しています。<br>
主にプログラムカウンタ（PC）の理解が必要です。<br>

## CPUでプログラムを実行するとは？

CPUがプログラムを実行する流れを解説します、ここでは **プログラムカウンタ（PC）という概念を** 学習します。

CPU と 1KB のメモリがあることを想像してください。<br>
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
|0x0003 |EXIT|

`PRINT` はモニタに指定した文字列を出力する命令とする
`EXIT` は処理を終了し、CPUを停止させる命令とする


### 動作定義１　CPUは以下の動作をする
- 1. CPU に電源を投入し起動すると `プログラムカウンタ（PC）` に 0x0000 が設定されます
  - 2. `プログラムカウンタ` と同値の `メモリアドレス` から命令を読み込む
  - 3. 読み込んだ命令を実行する
    - 4. 命令が `EXIT` 命令であれば処理を終了しCPUを停止する
  - 5. `プログラムカウンタ（PC）` に１を加算する
  - 6. `処理 2.` に戻り同様の処理を繰り返す

このようにCPUはあるアドレスから命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して命令を読み込み実行、アドレスを加算して...　と繰り返してプログラムを動作させます。<br>

> 実際の CPU の PC は＋１ではありません、MOV等の命令毎に加算バイト数が設定されており数バイトの値がPCに加算されます。

### 動作例１　CPUがプログラムを実行した結果
「表１　命令サンプル」のメモリ状態でCPUを起動し「動作定義１」に従い動作した場合の実行結果<br>

|実行内容|
|-|
|0x0000 を読み出したCPUは PRINT "Hello" を実行します|
|0x0001 を読み出したCPUは PRINT " World" を実行します|
|0x0002 を読み出したCPUは PRINT "!" を実行します|
|0x0003 を読み出したCPUは EXIT を実行します|

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
と出力し続けます、無限ループを作ることができます。

プログラム言語は `プログラムカウンタ（PC）を編集することで if文 や forループ といったものを実現しています` 、実際の if文 や for文 については後の項目で解説します。



## まとめ
- CPUはアドレスを順番に読み込んで命令を実行する
- プログラムカウンタ(PC)を設定することでアドレスジャンプができる


# レジスタとは何者か
CPU にはレジスタという一時的な記憶領域があり、これはPICやマイコンと呼ばれる物も含めて全てのCPUが持つ記憶領域です。

## レジスタの使い方
CPU はレジスタ同士の演算しかできません、そこでメモリに配置した数値をレジスタにコピーし、結果をメモリ上にコピーするという手順になります。<br>
※一部CPUでは メモリ⇔レジスタ の計算が可能ですがここではレジスタ間の計算しかできない前提で解説します


### CPU は直接メモリ間の数値を計算できない

全てのCPUが加算命令 `ADD` を持っていますが、メモリ上に配置した値同士を足し算することはできません。<br>


次のような足し算があったとします。<br>

```
answer = 1 + 2
```

次のようにメモリに値を配置します<br>

|メモリアドレス|値|
|-|-|
|0x0000|1|
|0x0001|2|

そして加算命令を実行するとして<br>
 `ADD 0x0000 0x0001` <br>
として「３」という計算結果を得ることはできないのです。<br>

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
MOV %LHS @a; LHS レジスタに a の値をコピー
MOV %RHS @b; RHS レジスタに b の値をコピー
ADD; LHSレジスタ と RHSレジスタ を加算した結果を LHSレジスタに格納する
MOV @answer %LHS; 計算結果を変数 answer にコピー
EXIT; プログラムを終了する
```

`'DATA' は 適当なアドレスに領域を確保し、そのアドレスをシンボルで参照できるようにする命令` <br>
`'MOV' はレジスタ～シンボル（変数）の間でデータコピーする命令`<br>
`'ADD' は LHSレジスタ と RHSレジスタ を加算した値を LHSレジスタに設定する命令`

とします。<br>
これらの条件で「疑似アセンブラ」を実行すると最終的に LHSレジスタに 3 が格納され足し算を完了します。<br>

このアセンブラをコンパイルしメモリに展開すると次のようなメモリ配置になります。

|メモリアドレス|値/命令|
|-|-|
|0x0000|MOV LHS a (アドレス 0x0100 の参照)|
|0x0001|MOV RHS b (アドレス 0x0101 の参照)|
|0x0002|ADD|
|0x0003|MOV @answer %LHS|
|0x0004|END|
|～省略～|～|
|0x0100|1|
|0x0101|2|
|0x0102|0（プログラム実行後は 3 に設定される）|

`DATA a 1` という命令は 0x0100 に 1 を配置し、コード内の a というシンボルは全てアドレスの 0x0100 参照に変換されます。<br>
`DATA b 2` という命令は 0x0101 に 2 を配置し、コード内の b というシンボルは全てアドレスの 0x0101 参照に変換されます。<br>
answer も同様に処理され answer というシンボルで 0x0102 を参照できるようになります。

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

LHSレジスタに回答を格納するほうがステップ数が減ります、そのため回答用レジスタ（ANS）を用意せず、LHSを上書きする形で計算結果を保存しています。

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
本来的なメモリ配置で解説していくと手間がかかるため、都合の良い解釈をしやすい疑似アセンブラによる解説を行っています。

## CPUにレジスタが必要な理由
推測になります。<br>
CPU設計をシンプルに保つため、動作クロック（処理時間）安定のためあたりが理由だと思います。<br>
メモリの配置されている場所（L1～L3）によっては数クロック～数十クロックの時間がかかるため常にメモリ間へアクセスするような設計だと処理時間が安定せず他の並列処理等への影響が大きいのだと思います。<br>

## スクリプトでレジスタ概念を再現する理由
レジスタについて解説してきましたが、これから実装するスクリプト言語は `レジスタ概念を再現して実装しています` 。<br>
本書のスクリプト言語の作り方はアセンブラの構造を模しています、そのためレジスタ概念を再現しての実装となります。<br>
もしかしたら他の設計もあるのかもしれません。<br>



# ここまでの内容で動作するコードを作ってみる

ここまでの項で次の概念を学びました

- プログラムカウンタ（PC）によるCPU実行の仕組み
- レジスタによる演算

この２つの概念理解ででスクリプト言語を作るための材料はある程度揃いました。<br>
次のように考えてプログラムでアセンブラを再現していきたいと思います。<br>

- メモリ空間
  - １次元配列に命令を並べる
- プログラムカウンタ（PC）
  - １次元配列のインデックス
- レジスタ
  - VMのロジックにレジスタ相当の変数テーブルを設定する
  - 変数テーブルを読み書きする命令の実装（DATA や MOV命令）
- if, for といった分岐、ループ
  - プログラムカウンタのジャンプと条件分岐する命令を実装

以上のような命令を作成し、その関数ポインタを配列に順番に並べたらプログラムが実行できます。<br>
`スタック` というとても重要な概念もあるのですが、それは後の項で解説します。

## 解析工程を省き、スクリプトから中間言語を作成する
スクリプト言語は次のような手順により実行されます。<br>
`スクリプトテキスト` → `解析処理` → `中間言語` → `VM 実行` <br>
ここからしばらくは **「 `スクリプトテキスト` に対して `中間言語` がどうあるべきか」** を中心に解説していきます。<br>
**`解析処理`** は一番最後の方で解説します、今は解説しません。<br>
「中間言語」がどうあるべきか、というゴールが分からない事には解析処理が書けないからです。<br>
まずは「スクリプトテキスト」に対する「中間言語」の対応を学びましょう。<br>

## 足し算するスクリプト
次のスクリプトを想定し、その中間言語を作っていきます。<br>

```
    DATA A 1; 変数 A を宣言し 1 を設定する
    DATA B 2; 変数 B を宣言し 2 を設定する
    DATA C 0; 変数 c を宣言し 0 を設定する
    MATH_ADD C A B; 変数 C に A + B の結果を設定する
    PRINT C; 計算結果を出力
```

`DATA A = 1` のほうが分かりやすいのに `DATA A 1` として演算子を省く理由ですが `テキスト解析処理が楽だから` です、＝ や ＋ 演算子の処理は結構手間がかかりますが、半角空白区切りで表現する言語形態だと `source_code.split(/\s+/)` で解析できるため非常に楽です。<br>
最小限のコード量でわかりやすく解説したいので解析コストの低いスクリプトフォーマットにしています。<br>

## 中間言語でどう表現するか考える

### `DATA A 1` に必要な命令

`DATA A 1` というスクリプトに対しどのような命令配列で対応するかを考えます。<br>

`A` という変数を準備して `1` を代入する処理が必要です。<br>
- `DATA A` として変数を作成
- `MOV A 1` として `A` に１を設定

こんな命令を準備すれば良さそうですが、少々冗長なので一つの命令にしたいと思います。<br>

- `DATA A 1` として、 `A` という変数を作成し `1` を設定する

元のスクリプトと同じ記述になってしまいました、シンプルな言語構成なのでそうなることもあります。<br>

```
DATA B 2
DATA C 0
```

ここも同様の処理ですので、前述した `DATA` 命令で実現できそうです。

### MATH_ADD C A B に必要な命令

```
MATH_ADD C A B; 変数 C に変数 A と 変数 B を加算した結果を格納する
```

変数の作成と代入処理は想像し易い物でしたが、足し算は簡単ですが、簡単な物を更に細分化しようと思うと少々困りませんか？<br>
次のように細分化して必要な命令を考えます。

- LHSレジスタ（左辺値）に変数を設定する命令
- RHSレジスタ（右辺値）に変数を設定する命令
- LHS, RHS レジスタを加算する命令
- 計算結果を変数に設定する命令

各々次のように命令仕様を設定します。<br>

- LHSレジスタ（左辺値）に変数を設定する命令
  - `LOADLHS A` として LHSレジスタに変数 `A` の値を設定します
- RHSレジスタ（右辺値）に変数を設定する命令
  - `LOADLHS B` として RHSレジスタに変数 `B` の値を設定します
- LHS, RHS レジスタを加算する命令
  - `ADD` とした場合には既に設定されている `LHS, RHS` レジスタを加算し結果を `LHSレジスタ` に設定します
- 計算結果を変数に設定する命令
  - `STORELHS C` として 変数 C に LHSレジスタ の値を設定します<br>

以上のように命令を作ることで足し算が実現できそうです。<br>

### デバッグ用に PRINT 命令を作成

実行中に動作確認するために出力する命令が必要です、次のように設定します。<br>

- `PRINT_VAR [変数名]` として変数の値を画面に出力
- `PRINT_REG [レジスタ名]` としてレジスタの値を画面に出力
- `PRINT_STR [文字列]` として文字列を出力

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

### 加算処理の中間言語

再度掲載します、次のようなプログラムコードの中間言語が作りたいのでした。<br>

```
    DATA A 1; 変数 A を宣言し 1 を設定する
    DATA B 2; 変数 B を宣言し 2 を設定する
    DATA C 0; 変数 c を宣言し 0 を設定する
    MATH_ADD C A B; 変数 C に A + B の結果を設定する
    PRINT C; 計算結果を出力
```

前の項までで作成した命令で中間言語にすると次のようになります。<br>

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

表の１行をメモリ空間のアドレス１つとして捉え行番号＝アドレスだと考えます。<br>
処理は１行目から開始され、２行目、３行目と１行ずつ逐次実行されていきます。<br>

では、この表に従い JavaScript を実装していきます、主処理部分だけ抜粋すると次のようになります。

```javascript
function execute() {
    /*
    以下のスクリプトの中間言語を手動で配列を編集して作成する

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


`operations_list` の部分が中間言語です。<br>
繰り返しになりますが `「スクリプト言語を作る」` とは文字列を解析して `「中間言語」` を作る変換器を作ることです。<br>
このコードを見て「簡単だ」と思った方もいるかと思います、その通りでここだけ見ると非常に簡単です、この辺の仕組みさえ分かってしまえば後は `テキストの解析（おパース処理）` ができてしまえば自作言語作成はできてしまいます。<br>
そしてその `テキストの解析（おパース処理）` が面倒なのです、著者の感想ですが `「難しい」` というよりかは `「面倒」` です。<br>

### VM 実行部

次に示すコードがVM実行部です。<br>

``` javascript
    var runtimeCtx = new RuntimeContext();
    while(runtimeCtx.PC < operations_list.length) {
        var operation = operations_list[runtimeCtx.PC];
        operation[0](runtimeCtx, operation.slice(1));
        runtimeCtx.PC += 1;
    }
```

中間言語の配列を一つずつ実行していくループ処理となっています。<br>
特に難しい事は無いと思います、関数参照の配列を一つずつ実行しているだけですね。<br>
ソースコードを掲載しますので実際に実行し動作を見てみましょう。<br>

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
    以下のスクリプトの中間言語を手動で配列を編集して作成する

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

### 実行結果

スクリプトを実行すると次のような結果になり足し算ができていることを確認できます。

```
C = 
3
LHS = 
3
RHS = 
2
```

前述のコードの `operations_list` の内容をスクリプトから自動的に生成するプログラムを作ることがスクリプト言語を作ることの主な作業です。<br>
引き続き「ある処理」に対して「中間言語」がどうあるべきかを解説していきます。<br>


### ちょっとだけ解析の話

|変換元のコード|変換後の命令配列|
|-|-|
|VAR A 1;|[[Operations.DATA, 'A', 1]]|
|VAR B 2;|[[Operations.DATA, 'B', 1]]|
|VAR C 0;|[[Operations.DATA, 'C', 0]]|
|MATH_ADD C A B;|[<br>[Operations.LOADLHS, 'A'],<br>[Operations.LOADRHS, 'B'],<br>[Operations.ADD],<br>[Operations.STORELHS, 'C']<br>]|

本格的なコード解析の話は後述ですが、作業イメージを掴んでもらうために表を作りました・<br>
左側がスクリプト言語のソース、右側がそのテキストを解析した結果出力される中間言語です。<br>
右側の配列を全てつなげて実行すればスクリプト言語の実行となります。<br>
スクリプト言語の変換・実行手順が少し想像できたでしょうか？



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

- テキスト解析（← 実装量が多く、開発コストが高い部分です）


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
`ランタイム` とは実行時に必要な物の総称で変数だったり関数だったりしますが、実行に必要な汎用的な部品を `ランタイム` と呼びます。<br>

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

と逐次実行されます。<br>


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
a = 5
b = 3
if a > b {
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
a = 5
b = 3
if a > b {
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

## if 分岐の中間言語

新たに `GT` 命令、 `JZ` 命令を追加し、実際のスクリプトを作ります。<br>

|命令名|機能|構文|
|-|-|-|
|JZ|LHSレジスタの値が 0 だったら指定ラベル（インデックス）にジャンプ|`JZ end_if`|
|GT|LHSレジスタとRHSレジスタを比較しLHSレジスタが大きければLHSレジスタに1を設定、それ以外は0を設定する|`GT` ※事前にLHS、RHSを設定する|

<br>
中間言語部分の抜粋です。<br>

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

### 実行結果

以下のように出力されます。

```
START
A is greater B
END
```

変数 A を 0 にすることで

```
START
END
```

このような出力となり `A is greater B` は表示されなくなります。<br>
if分岐の実装ができました。

# ループ処理（for文）

これまで解説してきた、`「加算」` `「無限ループ」` `「分岐」` を組み合わせることでループ文が作れそうです。<br>

次のような疑似コードを想像してください。<br>

|インデックス|命令|
|-|-|
|0|変数 i に 0 を設定|
|1|i に 1 加算|
|2|i が 10 以上になったら `end` にジャンプ|
|3|インデックス「1」にジャンプ|
|4| `end` ラベル |

今まで解説してきた `「加算」` `「無限ループ」` `「分岐」` により for ループ同等の動作が実現できています。<br>

新たに次の命令を実装します。<br>

|命令名|機能|構文|
|-|-|-|
|GE|LHSレジスタとRHSレジスタを比較してLHSレジスタがRHSレジスタと等しいか大きければLHSに1を設定する|`GE` ※事前にLHS、RHSを設定する|
|JMP|指定したラベルにジャンプする|`JMP end_loop`|

## ループの中間言語

ループの中間言語 を次のように実装します。<br>

| インデックス | コード（Operations省略）       | 解説 |
|-------------|------------------------------|------|
| 0           | `DATA, "i", 0`               | 変数 `i` に 0 を代入（ループカウンタの初期化） |
| 1           | `DATA, "_limit", 10`         | 変数 `_limit` に 10 を代入（ループ終了条件） |
| 2           | `DATA, "_inc", 1`            | 変数 `_inc` に 1 を代入（カウントアップ用） |
| 3           | `LOADLHS, "i"`               | 左辺（LHS）に `i` の値を読み込む |
| 4           | `LOADRHS, "_limit"`          | 右辺（RHS）に `_limit` の値を読み込む |
| 5           | `GE`                         | `LHS = (i >= _limit) ? 1 : 0` に変換 |
| 6           | `JZ, "loop_body"`            | LHS が 0（条件未達）なら `"loop_body"` にジャンプ（ループ継続） |
| 7           | `JMP, "loop_end"`            | そうでなければ `"loop_end"` にジャンプ（ループ終了） |
| 8           | `PRINT_VAR, "i"`             | 現在の `i` の値を出力 |
| 9           | `LOADLHS, "i"`               | 左辺に `i` の値を再度読み込む |
| 10          | `LOADRHS, "_inc"`            | 右辺に `_inc` の値を読み込む（= 1） |
| 11          | `ADD`                        | `LHS = i + 1` に変換（インクリメント） |
| 12          | `STORELHS, "i"`              | `i = LHS` → `i` を更新 |
| 13          | `JMP, "loop_start"`          | ループ先頭（インデックス3）に戻る |
| 14          | `PRINT_STR, "LOOP DONE"`     | `"LOOP DONE"` という文字列を出力 |
| 15          | `EXIT`                       | プログラム終了 |

ジャンプするPCの値については次のテーブルで管理します。<br>

``` javascript
    var jumpTable = {
        "loop_start": 3,
        "loop_body": 8,
        "loop_end": 14,
    }
```

### 実際の実装（主要部のみ）

実装の中間言語部分だけを記載します、次のようになります。<br>

``` javascript
function execute() {
    /*
        int i = 0;
        while (i < 10) {
            print(i);
            i = i + 1;
        }
    */
        var operations_list = [
            [Operations.DATA, "i", 0],           // 0: i = 0
            [Operations.DATA, "_limit", 10],     // 1: _limit = 10
            [Operations.DATA, "_inc", 1],        // 2: _inc = 1
            // loop_start                        // ラベル: ループ開始
            [Operations.LOADLHS, "i"],           // 3: LHS ← i
            [Operations.LOADRHS, "_limit"],      // 4: RHS ← _limit
            [Operations.GE],                     // 5: LHS = (i >= 10) ? 1 : 0
            [Operations.JZ, "loop_body"],        // 6: if LHS == 0 → ループ続行
            [Operations.JMP, "loop_end"],        // 7: 条件を満たさなければループ終了
            // loop_body                         // ラベル: ループ本体
            [Operations.PRINT_VAR, "i"],         // 8: print(i)
            [Operations.LOADLHS, "i"],           // 9: LHS ← i
            [Operations.LOADRHS, "_inc"],        // 10: RHS ← 1
            [Operations.ADD],                    // 11: LHS = i + 1
            [Operations.STORELHS, "i"],          // 12: i = LHS
            [Operations.JMP, "loop_start"],      // 13: ループ先頭へ戻る
            // loop_end                          // ラベル: ループ終了
            [Operations.PRINT_STR, "LOOP DONE"], // 14: print("LOOP DONE")
            [Operations.EXIT],                   // 15: プログラム終了
        ];

    // ジャンプテーブルを設定する
    var jumpTable = {
        "loop_start": 3,
        "loop_body": 8,
        "loop_end": 14,
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

ループのソースコード全体です・<br>

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
 * LHS と RHS を比較して、LHSのほうが大きいか等しい場合にLHSに1を設定する
 * 事前に LHS と RHS に値を設定しておく必要がある
 * @param {RuntimeContext} runtimeCtx
 */
Operations.GE = function GE(runtimeCtx, args) {
    if (runtimeCtx.LHS >= runtimeCtx.RHS) {
        runtimeCtx.LHS = 1;
    } else {
        runtimeCtx.LHS = 0;
    }
}

/**
 * 指定したラベルにジャンプする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] ラベル名
 */
Operations.JMP = function JMP(runtimeCtx, args) {
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
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
        int i = 0;
        while (i < 10) {
            print(i);
            i = i + 1;
        }
    */
        var operations_list = [
            [Operations.DATA, "i", 0],           // 0: i = 0
            [Operations.DATA, "_limit", 10],     // 1: _limit = 10
            [Operations.DATA, "_inc", 1],        // 2: _inc = 1
            // loop_start                        // ラベル: ループ開始
            [Operations.LOADLHS, "i"],           // 3: LHS ← i
            [Operations.LOADRHS, "_limit"],      // 4: RHS ← _limit
            [Operations.GE],                     // 5: LHS = (i >= 10) ? 1 : 0
            [Operations.JZ, "loop_body"],        // 6: if LHS == 0 → ループ続行
            [Operations.JMP, "loop_end"],        // 7: 条件を満たさなければループ終了
            // loop_body                         // ラベル: ループ本体
            [Operations.PRINT_VAR, "i"],         // 8: print(i)
            [Operations.LOADLHS, "i"],           // 9: LHS ← i
            [Operations.LOADRHS, "_inc"],        // 10: RHS ← 1
            [Operations.ADD],                    // 11: LHS = i + 1
            [Operations.STORELHS, "i"],          // 12: i = LHS
            [Operations.JMP, "loop_start"],      // 13: ループ先頭へ戻る
            // loop_end                          // ラベル: ループ終了
            [Operations.PRINT_STR, "LOOP DONE"], // 14: print("LOOP DONE")
            [Operations.EXIT],                   // 15: プログラム終了
        ];

    // ジャンプテーブルを設定する
    var jumpTable = {
        "loop_start": 3,
        "loop_body": 8,
        "loop_end": 14,
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


# だいぶプログラムぽくなってきた
今までの解説内容で `演算` `分岐` `ループ` ができるようになりました。<br>
だいぶプログラム言語らしい機能が備わってきたのではないでしょうか？<br>
`関数` 又は `サブルーチン` という機能を部品化する概念を作ったら完全なプログラミング言語ができそうです。<br>
`関数` 又は `サブルーチン` を本書では **`ユーザー定義関数`** と呼ぶことにします。<br>


# スタックと関数呼び出し

ユーザー定義関数を作成するためにスタックの仕組みを知っている必要があります。<br>
しつこいですがここでもPCの仕組みが重要です<br>
１次元のメモリ上を PC の値がインクリメントされ、その箇所のメモリを読み取る事によりプログラムは実行されています。<br>
`ユーザー定義関数` もそのルールの中で実装していくことになります。<br>

## スタックとは

`PUSH 1`  
とすると  
`[1]`  
となり、スタックの一番上に `1` が追加されます。

続いて、  
`PUSH 2`  
とすれば  
`[2, 1]`  
のように、**新しい値が先頭に追加されていきます**（後入れ先出し = LIFO: Last In, First Out の構造）。

次に、  
`POP W`  
とすると、**先頭の値 `2` が取り出され、レジスタ `W` に代入されます**。  
スタックの状態は次のように変化します。

```
[1]   ← スタックには 1 が残る
 W = 2
```

このようにスタックは「**先に積んだ値の上に新しい値を積み、取り出すときは一番上から取り出す**」という構造です。  
これにより、ユーザー定義関数の「戻り先」や「一時的な計算結果」などを保存しておくのに非常に便利です。

関数呼び出しの際に「**戻る場所を PUSH で積んでおく → 処理が終わったら POP して戻る**」という流れも、この仕組みによって実現できます。


## ユーザー定義関数とスタックの利用方法

次のユーザー定義関数の呼び出しについて考えます。<br>

- main関数では ユーザー定義関数 funcA を呼び出します
- funcA の中では fcunB を呼んでいます。
- funcB の中では fcunC を呼んでいます。

この時、呼び出し元のPCをスタックに保存し、関数呼び出しは `JMP` を実行することで実装します。<br>
呼び出されたユーザー定義関数が処理を終え元の処理に戻る時、スタックの先頭を取り出し、その値をPCに設定することで元の処理に復帰します<br>





## 疑似アセンブラによるユーザー定義関数の実装（未完成）
次の擬似アセンブラを思考実験として実行してみてください。<br>
スタックの仕組みを知るためにわざと完成形ではない疑似アセンブラ実装をしています。<br>



この疑似アセンブラは :main(19行目) から開始されます。<br>

```
:funcC
PRINT "C"
POP W         ; funcB からの戻り先を取得
JMP W

:funcB
PUSH PC + 2   ; funcC から戻る場所
JMP funcC
PRINT "B"
POP W         ; funcA からの戻り先を取得
JMP W

:funcA
PUSH PC + 2   ; funcB から戻る場所
JMP funcB
PRINT "A"
POP W         ; main からの戻り先を取得
JMP W

:main
PUSH PC + 2   ; funcA から戻る場所
JMP funcA
PRINT "MAIN DONE"
EXIT
```

見やすいように表にします。<br>
開始は インデックス 16 からになります、:main 等のラベル行はなにも処理せず次の行の処理へ移行します。<br>

| インデックス | コード                         | 解説                                                                 |
|--------------|------------------------------|----------------------------------------------------------------------|
| 0            | `:funcC`                      | ユーザー定義関数 funcC の開始ラベル                                   |
| 1            | `PRINT "C"`                  | "C" を表示（funcC の処理内容）                                       |
| 2            | `POP W`                      | スタックの先頭から戻り先アドレスを取り出して W レジスタに格納             |
| 3            | `JMP W`                      | W に格納されたアドレス（funcB の続き）にジャンプ                        |
| 4            | `:funcB`                      | ユーザー定義関数 funcB の開始ラベル                                   |
| 5            | `PUSH PC + 2`                | funcC 呼び出し後に戻るためのアドレス（次の PRINT 文の位置）をスタックに積む |
| 6            | `JMP funcC`                  | funcC（0） へジャンプ                                                     |
| 7            | `PRINT "B"`                  | "B" を表示（funcB の処理内容）                                       |
| 8            | `POP W`                      | スタックから funcA の戻り先アドレスを取り出し、W に格納                 |
| 9            | `JMP W`                      | W に格納されたアドレス（funcA の続き）にジャンプ                        |
| 10           | `:funcA`                      | ユーザー定義関数 funcA の開始ラベル                                   |
| 11           | `PUSH PC + 2`                | funcB 呼び出し後に戻るためのアドレスをスタックに積む                     |
| 12           | `JMP funcB`                  | funcB（4） へジャンプ                                                     |
| 13           | `PRINT "A"`                  | "A" を表示（funcA の処理内容）                                       |
| 14           | `POP W`                      | スタックから main の戻り先アドレスを取り出し、W に格納                  |
| 15           | `JMP W`                      | W に格納されたアドレス（main の続き）にジャンプ                        |
| 16           | `:main`                       | main 関数の開始ラベル                                                |
| 17           | `PUSH PC + 2`                | funcA 呼び出し後に戻るためのアドレスをスタックに積む                     |
| 18           | `JMP funcA`                  | funcA（10） へジャンプ                                                     |
| 19           | `PRINT "MAIN DONE"`          | "MAIN DONE" を表示（すべての処理が終わったことを示す）                 |
| 20           | `EXIT`                       | プログラム終了                                                       |


## ユーザー定義関数呼び出し時のスタック状況
![呼び出し時のスタック状況](./figure/stack_of_call.png)



## ユーザー定義関数戻り時の時のスタック状況
![戻り時のスタック状況](./figure/stack_of_return.png)


## PC の制御を自動的に行う命令を作る
スタックを使用して呼び出し元に戻る仕組みを作りましたが、かなり面倒ですね、そして毎回同じ事をやっているのだから「そういう機能」にまとめられそうです。<br>
そこで次の命令を作成します<br>

|命令名|機能|構文|
|-|-|-|
|CALL|現在のPCに +1 した値（次の行）をスタックにPUSHし指定ラベルにJMPする|`CALL funcA`|
|RET|スタックからPOPしたPCにJMPする|`RET`|

## CALL、RETを使って実装

PUSH, POP でPCの値を保存、復帰していましたが、新たに作った CALL、 RET 命令でさきほどのサンプルコードを作り直します。<br>

```
:funcC
PRINT "C"
RET

:funcB
CALL funcC
PRINT "B"
RET

:funcA
CALL funcB
PRINT "A"
RET

:main
CALL funcA
PRINT "MAIN DONE"
EXIT

```

だいぶスッキリしましたね、将来的に中間言語は自動的に作る物とはいえシンプルな作りのほうが良いですね。<br>

次の表を見てスタックの動きを追いかけてみましょう。<br>
プログラムは :main(11行目) から開始されます。<br>

### 呼び出し時のスタックの動き（main～funcC RETの直前まで）

| インデックス | コード              | 解説                                                                 | 呼び出し時のスタック|
|--------------|---------------------|----------------------------------------------------------------------|--------------------|
| 0            | `:funcC`            | ユーザー定義関数 funcC の開始ラベル                         | [13, 9, 5] |
| 1            | `PRINT "C"`         | "C" を表示（funcC の処理内容）                          | [13, 9, 5]|
| 2            | `RET`               | スタックトップ（funcBの戻り先）へジャンプ                       | [-] |
| 3            | `:funcB`            | funcB の開始ラベル                                     | [13, 9] |
| 4            | `CALL funcC`        | funcC を呼び出し、戻り先（PC+1）を PUSH              | [13, 9, 5] |
| 5            | `PRINT "B"`         | funcC から戻ってきた後の処理                               | [-] |
| 6            | `RET`               | funcA の戻り先へジャンプ                                  | [-]      |
| 7            | `:funcA`            | funcA の開始ラベル                                      | [13]      |
| 8            | `CALL funcB`        | funcB を呼び出し、戻り先（PC+1）を PUSH               | [13, 9] |
| 9            | `PRINT "A"`         | funcB から戻ってきた後の処理                                | [-]      |
| 10           | `RET`               | main の戻り先へジャンプ                                    | [-]                 |
| 11           | `:main`             | main 関数の開始ラベル                                    | []                 |
| 12           | `CALL funcA`        | funcA を呼び出し、戻り先（PC+1）を PUSH                | [13]      |
| 13           | `PRINT "MAIN DONE"` | すべての関数から戻ってきたあとのメッセージ                          |[-]|
| 14           | `EXIT`              | プログラム終了                                            |[-]|


### 関数戻り時のスタックの動き（funcC RET から main に戻るまで）

| インデックス | コード              | 解説                                                                 | 戻り時のスタック|
|--------------|---------------------|----------------------------------------------------------------------|--------------------|
| 0            | `:funcC`            | ユーザー定義関数 funcC の開始ラベル                         | [-] |
| 1            | `PRINT "C"`         | "C" を表示（funcC の処理内容）                          | [13, 9, 5]|
| 2            | `RET`               | funcBの戻り先（5）へジャンプ                       | [13, 9] |
| 3            | `:funcB`            | funcB の開始ラベル                                     | [-] |
| 4            | `CALL funcC`        | funcC を呼び出し、戻り先（funcBの次行）を PUSH              | [13, 9] |
| 5            | `PRINT "B"`         | funcC から戻ってきた後の処理                               | [13, 9] |
| 6            | `RET`               | funcA の戻り先（9）へジャンプ| [13]      |
| 7            | `:funcA`            | funcA の開始ラベル                                      | []      |
| 8            | `CALL funcB`        | funcB を呼び出し、戻り先（funcAの次行）を PUSH               | [-] |
| 9            | `PRINT "A"`         | funcB から戻ってきた後の処理                                | [13]      |
| 10           | `RET`               | main の戻り先（13）へジャンプ                                    | []                 |
| 11           | `:main`             | main 関数の開始ラベル                                    | []                 |
| 12           | `CALL funcA`        | funcA を呼び出し、戻り先（mainの次行）を PUSH                | []      |
| 13           | `PRINT "MAIN DONE"` | すべての関数から戻ってきたあとのメッセージ                          |[]|
| 14           | `EXIT`              | プログラム終了                                            |[]|

## ユーザー定義関数の実装、主要部のみ

ユーザー定義関数の中間言語を次のように実装します。<br>

``` javascript
function execute() {
    /*
        FUNCTION funcC
          PRINT "C"
        END_FUNCTION

        FUNCTION funcB
          CALL funcC
          PRINT "B"
        END_FUNCTION

        FUNCTION funcA
          CALL funcB
          PRINT "A"
        END_FUNCTION

        MAIN
          CALL funcA
        END_MAIN
    */
        var operations_list = [
            // funcC
            [Operations.LABEL, "funcC"],                    // 0: 関数funcCの先頭
            [Operations.PRINT_STR, "C"],                    // 1: "C" を表示
            [Operations.RET],                               // 2: 呼び出し元に戻る
        
            // funcB
            [Operations.LABEL, "funcB"],                    // 3: 関数funcBの先頭
            [Operations.CALL, "funcC"],                     // 4: funcCを呼び出し
            [Operations.PRINT_STR, "B"],                    // 5: "B" を表示
            [Operations.RET],                               // 6: 呼び出し元に戻る
        
            // funcA
            [Operations.LABEL, "funcA"],                    // 7: 関数funcAの先頭
            [Operations.CALL, "funcB"],                     // 8: funcBを呼び出し
            [Operations.PRINT_STR, "A"],                    // 9: "A" を表示
            [Operations.RET],                               // 10: 呼び出し元に戻る
        
            // main
            [Operations.LABEL, "main"],                     // 11: MAIN関数の先頭
            [Operations.CALL, "funcA"],                     // 12: funcAを呼び出し
            [Operations.EXIT],                              // 13: プログラム終了
        ];
        

    // ジャンプテーブルを設定する
    var jumpTable = {
        "main": 11,
        "funcA": 7,
        "funcB": 3,
        "funcC": 0,
    }
    var runtimeCtx = new RuntimeContext(jumpTable);
    runtimeCtx.PC = jumpTable["main"]; // プログラムカウンタをMAIN関数の先頭に設定する
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

## ユーザー定義関数の実装、全体

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
    self.stack = [];
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
 * LHS と RHS を比較して、LHSのほうが大きいか等しい場合にLHSに1を設定する
 * 事前に LHS と RHS に値を設定しておく必要がある
 * @param {RuntimeContext} runtimeCtx
 */
Operations.GE = function GE(runtimeCtx, args) {
    if (runtimeCtx.LHS >= runtimeCtx.RHS) {
        runtimeCtx.LHS = 1;
    } else {
        runtimeCtx.LHS = 0;
    }
}

/**
 * 指定したラベルにジャンプする
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] ラベル名
 */
Operations.JMP = function JMP(runtimeCtx, args) {
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
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
 * 関数呼び出し
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] 関数名（ラベル名）
 */
Operations.CALL = function CALL(runtimeCtx, args) {
    runtimeCtx.stack.push(runtimeCtx.PC + 1); // 現在のPCをスタックに保存
    runtimeCtx.PC = runtimeCtx.jumpTable[args[0]];
}

/**
 * 関数から戻る
 * @param {RuntimeContext} runtimeCtx
 */
Operations.RET = function RET(runtimeCtx, args) {
    runtimeCtx.PC = runtimeCtx.stack.pop(); // スタックからPCを取得
}

/**
 * ラベルを定義する
 * @param {RuntimeContext} runtimeCtx
 * @param {string} args[0] ラベル名
 */
Operations.LABEL = function LABEL(runtimeCtx, args) {
    // NOP
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
        FUNCTION funcC
          PRINT "C"
        END_FUNCTION

        FUNCTION funcB
          CALL funcC
          PRINT "B"
        END_FUNCTION

        FUNCTION funcA
          CALL funcB
          PRINT "A"
        END_FUNCTION

        MAIN
          CALL funcA
        END_MAIN
    */
        var operations_list = [
            // funcC
            [Operations.LABEL, "funcC"],                    // 0: 関数funcCの先頭
            [Operations.PRINT_STR, "C"],                    // 1: "C" を表示
            [Operations.RET],                               // 2: 呼び出し元に戻る
        
            // funcB
            [Operations.LABEL, "funcB"],                    // 3: 関数funcBの先頭
            [Operations.CALL, "funcC"],                     // 4: funcCを呼び出し
            [Operations.PRINT_STR, "B"],                    // 5: "B" を表示
            [Operations.RET],                               // 6: 呼び出し元に戻る
        
            // funcA
            [Operations.LABEL, "funcA"],                    // 7: 関数funcAの先頭
            [Operations.CALL, "funcB"],                     // 8: funcBを呼び出し
            [Operations.PRINT_STR, "A"],                    // 9: "A" を表示
            [Operations.RET],                               // 10: 呼び出し元に戻る
        
            // main
            [Operations.LABEL, "main"],                     // 11: MAIN関数の先頭
            [Operations.CALL, "funcA"],                     // 12: funcAを呼び出し
            [Operations.EXIT],                              // 13: プログラム終了
        ];
        

    // ジャンプテーブルを設定する
    var jumpTable = {
        "main": 11,
        "funcA": 7,
        "funcB": 3,
        "funcC": 0,
    }
    var runtimeCtx = new RuntimeContext(jumpTable);
    runtimeCtx.PC = jumpTable["main"]; // プログラムカウンタをMAIN関数の先頭に設定する
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

# 中間言語についての解説はほぼ終わり

`演算` 、 `分岐(IF)` 、 `ループ(while)` 、 `ユーザー定義関数` の中間言語の解説がほぼ終わりました。<br>
スクリプト言語を中間言語に変換する機構を作ればスクリプト言語の完成です。<br>
ユーザー定義関数の引数、戻り値の実装についてはテキスト解析の項で解説します。<br>


# テキスト解析

スタートとゴールを明確にするため、スクリプト言語（スタート）と中間言語（ゴール）を示します。<br>

- スクリプト言語

```
FUNCTION SUM3 x y z result
  MATH_ADD result x y
  MATH_ADD result result z
END_FUNCTION

MAIN
  PRINT "START MAIN"
  DATA a 1
  DATA b 2
  DATA c 3
  DATA answer 0
  DATA result 0
  CALL_FUNCTION SUM3 a b c answer
  PRINT "answre = " "@answer"
  PRINT "END MAIN"
END_MAIN
```

- 変換後の中間言語

中間言語の配列変数をダンプした結果です。

```
0, PEEK, %LHS, 1
1, LOADRHS, 4
2, EQ
3, JNZ, function_start_0
4, PRINT, 引数の数が異なります, SUM3, 必要な引数の数: 4
5, EXIT
6, DATA, @x, 0
7, PEEK, @x, 2
8, DATA, @y, 0
9, PEEK, @y, 3
10, DATA, @z, 0
11, PEEK, @z, 4
12, DATA, @result, 0
13, PEEK, @result, 5
14, LOADLR, @x, @y
15, ADD
16, MOV, @result, %LHS
17, LOADLR, @result, @z
18, ADD
19, MOV, @result, %LHS
20, POKE, 5, @result
21, POKE, 4, @z
22, POKE, 3, @y
23, POKE, 2, @x
24, RET
25, PRINT, *START MAIN
26, DATA, @a, 1
27, DATA, @b, 2
28, DATA, @c, 3
29, DATA, @answer, 0
30, DATA, @result, 0
31, PUSH, @answer
32, PUSH, @c
33, PUSH, @b
34, PUSH, @a
35, PUSH, 4
36, CALL, SUM3
37, POP, %W
38, POP, @a
39, POP, @b
40, POP, @c
41, POP, @answer
42, PRINT, *answre = , @answer
43, PRINT, *END MAIN
44, EXIT
```

これから解説するのは **`スクリプト言語`** から **`中間言語`** への変換工程になります。<br>
前述の中間言語には `PEEK` や `POKE` といった今までの解説に出てこなかった命令が出てきます、 `@` や `%` といった仕様も解説していなかったと思います、このあたりはどのように言語を実装していくかという個人の趣味の範囲の仕様なので特に解説していません。<br>
テキスト解析は開発スキルや趣味趣向がかなり出てくる部分ですのでできるだけ解説を最低限に留めたいと思います。

## トークン分割とラベルの作成

## 実際の組み立て




