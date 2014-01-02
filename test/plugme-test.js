var Plugme = require('../index');

describe('Plugme', function () {

    var plug = new Plugme();

    describe ('Using API as documented', function () {

        it ('should set a component', function () {
            plug.set('a', function (next) {
                next('A');
            });
        });

        it ('should retrieve a component with a string', function (done) {
            plug.get('a', function (err, a) {
                (err == null).should.be.ok;
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
            plug.get(['b'], function (err, b) {
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

        it ('should return an error if a component is not set', function (done) {
            plug.get('does not exist', function (err, doesNotExist) {
                err.should.be.an.instanceof(Error);
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
            plug.get('scalar', function (err, scalar) {
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

    describe ('Forbiden cases', function () {

        it ('should throw an error if a factory returns a value and call the return function', function (done) {
            plug.set('aaa', function (next) {
                next('a');
                return 'a';
            });
            (function () {
                plug.get('aaa', function (err, aaa) {
                    done();
                });
            }).should.throw();
        });
    });

    describe ('#set with wrong parameters', function () {

        it ('should accept only a string as a name', function () {
            (function () {
                var NOT_A_STRING = 1;
                plug.set(NOT_A_STRING, function () {});
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
});
