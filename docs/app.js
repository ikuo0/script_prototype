
console.log('app.js loaded.');

function Router(config) {
    var self = this;
    self.redirectList = config.redirectList;
    self.handleHashChange = function() {
        var hash = location.hash.substring(1); // 例: '#hoge' → 'hoge'
        if (!hash) {
            window.location.href = location.pathname + '#main';
            return;
        }

        // リダイレクト設定があればリダイレクト
        if(hash in self.redirectList) {
            hash = self.redirectList[hash];
        }

        // scriptタグにhash依存の名前を付ける
        // 既に存在したら削除する
        var scriptId = "dynamic_load_script_" + hash;
        var oldScript = document.getElementById(scriptId);
        if(oldScript) {
            console.log("remove old script tag." + scriptId);
            oldScript.remove();
        }
    
        var htmlPath = `./${hash}/${hash}.html`;
        var jsPath   = `./${hash}/${hash}.js`;
    
        // HTML を読み込んで挿入
        $.get(htmlPath)
            .done(function(data) {
                $('#main_contents').empty().append(data);
    
                // JS を動的に読み込んで実行
                // id  = js_[hash] とする
                var script = document.createElement('script');
                script.id = scriptId;
                script.src = jsPath;
                script.onload = () => console.log(`${jsPath} loaded.`);
                script.onerror = () => console.warn(`${jsPath} not found.`);
                document.body.appendChild(script);
            })
            .fail(function() {
                $('#main_contents').html('<p>コンテンツの読み込みに失敗しました。 hash=' + hash + '</p>');
            });
    }

    self.start = function() {
        this.handleHashChange(); // 初回呼び出し
        $(window).on('hashchange', this.handleHashChange.bind(this));   
    }
}

function Application(config) {
    var self = this;
    self.router = new Router(config);
    self.start = function() {
        var me = this;
        me.router.start();
    }
    self.jumpHash = function(hash) {
        console.log(location.hash, hash);
        if(location.hash === hash) {
            console.log("HASHが同じなのでリロード");
            self.router.handleHashChange();
        } else {
            window.location.href = location.pathname + hash;
        }
    }
}
