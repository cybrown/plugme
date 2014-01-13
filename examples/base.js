var Plugme = require('../index').Plugme;

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

plug.get(['add', 'async_add'], function (add, async_add) {
    console.log(add(1, 2) === async_add(1, 2));
});
