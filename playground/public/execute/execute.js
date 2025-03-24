
console.log('execute.js loaded.');

new (function () {
    var self = this;
    self.parse = function() {
        var me = this;
        var sourceCode = $("#code-input").val();
        var $stdout = $("#execute_stdout");
        $stdout.empty();
        if(sourceCode.trim() === "") {
            $stdout.val("Please input source code.");
            return false;

        }
        try {
            var parseCtx = parse(sourceCode);
        } catch(e) {
            $stdout.val(e);
            console.log(e);
            //alert(e);
            return false;
        }
        return parseCtx;
    }

    self.execute = function() {
        var me = this;
        var $stdout = $("#execute_stdout");
        var parseCtx = me.parse();
        if(!parseCtx) {
            return;
        }
        var splitContext = splitExecuteInit(parseCtx);
        function executeMain() {
            try {
                var runtimeCtx = splitExecuteMain(splitContext, 100);
            } catch(e) {
                console.log(e);
                $stdout.append(e + "\n");
                return;
            }
            if(runtimeCtx.console.hasStdout()) {
                var msgs = runtimeCtx.console.consumeStdout();
                for(var i = 0; i < msgs.length; i++) {
                    var msg = msgs[i];
                    console.log(msg);
                    $stdout.append(msg + "\n");
                }
            }
            if(splitContext.processIsEnd) {
                console.log("処理が終了しました");
                $stdout.append("\n処理が終了しました\n");
                return;
            } else {
                setTimeout(executeMain, 0);
            }
        }
        executeMain();
    }
    self.start = function() {
        console.log("execute#start");
        var me = this;
        me.execute();
    }
    self.start();
});
