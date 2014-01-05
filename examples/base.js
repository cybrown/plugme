var Plugme = require('../index');

var plug = new Plugme();

plug.set('add', function () {
    return function (a, b) {
        return a + b;
    };
});

plug.set('async_add', function (done) {
    setTimeout(function () {
        done(function (a, b) {
            return a + b;
        });
    });
});

plug.get(['add', 'add_async'], function (add, add_async) {
    console.log(add(1 + 2) === add_async(1 + 2));
});
