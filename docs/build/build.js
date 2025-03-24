
console.log('build.js loaded.');

new (function () {
    var self = this;
    self.build = function() {
        var me = this;
        var sourceCode = $("#code-input").val();
        var $buildViewList = $("#builded_view_list");
        $buildViewList.empty();
        if(sourceCode.trim() === "") {
            $buildViewList.val("Please input source code.");
            return;

        }
        try {
            var parseCtx = parse(sourceCode);
        } catch(e) {
            $buildViewList.val(e);
            console.log(e);
            //alert(e);
            return;
        }
        var executeList = dumpParseContexts(parseCtx);
        for(var i = 0; i < executeList.length; i++) {
            var view = executeList[i];
            $buildViewList.append(view + "\n");
        }
        $buildViewList.append("\n\n");
        $buildViewList.append(JSON.stringify(parseCtx.jumpTable, null, 2));
    }
    self.start = function() {
        var me = this;
        me.build();
    }
    self.start();
});
