
console.log('index.js loaded.');

function Index() {
    var self = this;
    self.executeLoopCounter = 0;
    self.executeLoopChunkSize = 100;
    self.executeLoopChunkMax = 10000;
    self.splitExecuteInit = function() {
        var me = this;
        me.executeLoopCounter = 0;
        me.executeLoopChunkSize = 100;
        me.executeLoopChunkMax = 10000;
    }
    self.splitExecuteMain = function() {
        var me = this;
        for(var i = 0; i < me.executeLoopChunkSize; i++) {
            if(me.executeLoopCounter >= me.executeLoopChunkMax) {
                break;
            }
            me.executeLoopCounter += 1;
        }
        console.log("me.executeLoopCounter =", me.executeLoopCounter);
        if(me.executeLoopCounter >= me.executeLoopChunkMax) {
            // ループ終了
        } else {
            // ループ継続、一旦処理を中断して次のイベントループで再開
            setTimeout(function() {
                me.splitExecuteMain();
            }, 0);
        }
    }

    self.setupEvents = function() {
        var me = this;
        // ビルドボタンクリック
        $("#button_build").on("click", function() {
            console.log("click button_build");
            app.jumpHash("#build");
        });

        // 概要ボタンクリック
        $("#button_description").on("click", function() {
            console.log("click button_overview");
            app.jumpHash("#description");
        });

        // 実行ボタンクリック
        $("#button_execute").on("click", function() {
            console.log("click button_execute");
            app.jumpHash("#execute");
        });

        // サンプルボタンクリック
        $("#button_sample").on("click", function() {
            console.log("click button_sample");
            app.jumpHash("#sample");
        });
    }
    self.start = function() {
        var me = this;
        me.setupEvents();
    }
}

(new Index()).start();
