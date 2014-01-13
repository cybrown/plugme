var Plugme = require('../index').Plugme;

describe('Plugme', function () {

    var plug = new Plugme();

    describe ('Using API as documented', function () {

        it ('should set a component', function () {
            plug.set('a', function (next) {
                next('A');
            });
        });

        it ('should set multiple scalar values', function () {
            plug.set({
                'login': 'user',
                'password': 'userpass'
            });
            plug.get(['login', 'password'], function (login, password) {
                login.should.eql('user');
                password.should.eql('userpass');
            });
        });

        it ('should set a function scalar value (function as value and not factory)', function (done) {
            plug.set({
                'func': function () {
                    return 'a';
                }
            });
            plug.get(['func'], function (func) {
                func.should.not.eql('a');
                func().should.eql('a');
                done();
            });
        });


        it ('should retrieve a component with a string', function (done) {
            plug.get('a', function (a) {
                (a == null).should.not.be.ok;
                a.should.eql('A');
                done();
            });
        });

        it ('should retrieve components with an array', function (done) {
            plug.get(['a'], function (a) {
                a.should.eql('A');
                done();
            });
        });

        it ('should return true if a component is loaded', function () {
            plug.isLoaded('a').should.eql(true);
        });

        it ('should return false if a component is not loaded', function () {
            plug.isLoaded('d').should.eql(false);
        });

        it ('should set a component with a dependency', function () {
            plug.set('b', ['c'], function (c, next) {
                c.should.eql('C');
                next('B');
            });
            plug.set('c', function (next) {
                next('C');
            });
        });

        it ('should retrieve a component with a dependency', function (done) {
            plug.get(['b'], function (b) {
                plug.isLoaded('c').should.eql(true);
                done();
            });
        });

        it ('should set a component with a dependency already loaded', function () {
            plug.set('d', ['a'], function (a, next) {
                next({a: a});
            });
        });

        it ('should retrieve a component with a dependency already loaded', function (done) {
            plug.get(['d'], function (d) {
                d.a.should.eql('A');
                done();
            });
        });

        it ('should return two components', function (done) {
            plug.get(['a', 'b'], function (a, b) {
                a.should.eql('A');
                b.should.eql('B');
                done();
            });
        });

        it ('should add components', function () {
            plug.set('e', function (next) {
                next('E');
            });
        });

        it ('should add components directly from returning them without calling the callback', function () {
            plug.set('f', ['g'], function (g, next) {
                return 'F';
            });
            plug.set('g', function (next) {
                return 'G';
            });
        });

        it ('should return two previously unloaded components with a dependency', function (done) {
            plug.get(['e', 'f'], function (e, f) {
                e.should.eql('E');
                f.should.eql('F');
                plug.isLoaded('g').should.eql(true);
                done();
            });
        });

        it ('should add a scalar component', function () {
            plug.set('scalar', 'localhost:3000');
        });

        it ('should load a scalar component immediatly', function () {
            plug.isLoaded('scalar').should.eql(true);
        });

        it ('should retrieve a scalar component', function (done) {
            plug.get('scalar', function (scalar) {
                scalar.should.eql('localhost:3000');
                done();
            });
        });

        it ('should try to load a component only once', function (done) {
            plug.set('once', function (next) {
                setTimeout(done);
                setTimeout(next, 10);
            });
            plug.get('once', function () {});
            plug.get('once', function () {});
        });

        it ('should get a loading component', function (done) {
            plug.set('once2', function (next) {
                setTimeout(next, 10);
            });
            plug.get('once2', function () {});
            plug.get('once2', done);
        });

        it ('should throw an error if starting without a start component', function () {
            (function () {
                plug.start();
            }).should.throw();
        });

        it ('should call the start component with the start method, with or without a callback', function (done) {
            plug.set('start', function () {
                return null;
            });
            plug.start();
            plug.start(done);
        });
    });

    describe ('#set with wrong parameters', function () {

        it ('should accept only a string as a name, or a plain object of dependencies', function () {
            (function () {
                var NOT_A_STRING_NOR_AN_OBJECT = 1;
                plug.set(NOT_A_STRING_NOR_AN_OBJECT, function () {});
            }).should.throw();
        });

        it ('should accept only a string or array of strings as dependencies name', function () {
            (function () {
                var NOT_A_STRING = 1;
                plug.set('aaa', NOT_A_STRING, function () {});
            }).should.throw();
        });
    });

    describe ('#get with wrong parameters', function () {

        it ('should accept only a string or an array of string as dependency name', function () {
            (function () {
                var NOT_A_STRING = 1;
                plug.get(NOT_A_STRING, function () {});
            }).should.throw();
        })

        it ('should accept only a function as callback', function () {
            (function () {
                plug.get('a', 'not a function');
            }).should.throw();
        })
    });

    describe ('Error handling', function () {

        var a = 1, errHandler;
        errHandler = function () {
            a++;
        };

        it ('should add an error handler', function () {
            plug.onError(errHandler);
        });

        it ('should call an error handler if an error occurs', function (done) {
            var localErrorHandler = function () {
                a.should.eql(2);
                plug.offError(localErrorHandler);
                done();
            };
            plug.set('error', function () {
                throw new Error('a test error');
            });
            plug.onError(localErrorHandler);
            plug.get('error', function (error) {

            });
        });

        it ('should remove an error handler, and set an handler once', function (done) {
            plug.offError(errHandler);
            plug.onceError(function () {
                a.should.eql(2);
                done();
            });
            plug.get('error', function () {

            });
        });

        it ('should emit an error if a factory returns a value and call the return function', function (done) {
            plug.set('aaa', function (next) {
                next('a');
                return 'a';
            });
            plug.onceError(function () {
                done();
            });
            plug.get('aaa', function (aaa) {

            });
        });

        it ('should not emit an error if a factory returns normaly', function (done) {
            plug.timeout = 100;
            plug.set('bbb', function (next) {
                next('b');
            });
            var errFunc = function (err) {
                throw new Error('Should not be called');
            };
            plug.onceError(errFunc);
            plug.get('bbb', function (bbb) {

            });
            setTimeout(function () {
                plug.offError(errFunc);
                done();
            }, 200);
        });

        it ('should emit an error if a factory do not call the return callback before the timeout', function (done) {
            plug.timeout = 100;
            plug.set('never', function (next) {

            });
            plug.onceError(function (err) {
                done();
            });
            plug.get('never', function () {

            });
        });

        it ('should cancel a callback if timeout is reached', function (done) {
            plug.timeout = 100;
            plug.set('never', function (next) {
                setTimeout(function () {
                    next(null);
                }, 150);
            });
            plug.get('never', function (never) {
                done(1);    // should not be called
            });
            setTimeout(done, 200);
        });

        it ('should emit an error if a component is not found', function (done) {
            plug.onceError(function () {
                done();
            });
            plug.get('not_found', function (not_found) {
                throw new Error("This should not be executed");
            });
        });

        it ('should emit an error if a component is not found', function (done) {
            plug.onceError(function () {
                done();
            });
            plug.get(['a', 'not_found'], function (a, not_found) {
                throw new Error("This should not be executed");
            });
        });
    });
});
