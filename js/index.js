var async = require("async");

var plugme;
(function (plugme) {
    var assert = function (condition, description) {
        if (!condition) {
            throw new Error(description);
        }
    };

    var Plugme = (function () {
        function Plugme() {
            this._registry = {};
            this._errorHandlers = [];
            this.timeout = 10000;
        }
        Plugme.prototype.onError = function (cb) {
            this._errorHandlers.push(cb);
        };

        Plugme.prototype.onceError = function (cb) {
            cb.once = true;
            this._errorHandlers.push(cb);
        };

        Plugme.prototype.offError = function (cb) {
            var index = this._errorHandlers.indexOf(cb);
            if (index !== -1) {
                this._errorHandlers.splice(index, 1);
            }
        };

        Plugme.prototype.set = function (pNameOrDict, pDepsOrFactory, pFactory) {
            assert(['string', 'object'].indexOf(typeof pNameOrDict) >= 0, 'Plugme#set first argument must be a string or a plain object');
            if (typeof pNameOrDict === 'string') {
                if (typeof pFactory === 'function') {
                    this._setFactory(pNameOrDict, pDepsOrFactory, pFactory);
                } else if (typeof pDepsOrFactory === 'function') {
                    this._setFactory(pNameOrDict, [], pDepsOrFactory);
                } else {
                    this._setScalar(pNameOrDict, pDepsOrFactory);
                }
            } else {
                this._setDictionary(pNameOrDict);
            }
        };

        Plugme.prototype.get = function (pNameOrDeps, cb) {
            if (typeof pNameOrDeps !== 'string') {
                pNameOrDeps.forEach(function (dep) {
                    assert(typeof dep === 'string', 'Plugme#set dependencies must be a string or an array of strings');
                });
            }
            if (typeof pNameOrDeps === 'string') {
                this._getOne(pNameOrDeps, function (err, ret) {
                    if (!err) {
                        cb(ret);
                    }
                });
            } else {
                async.map(pNameOrDeps, this._getOne.bind(this), function (err, results) {
                    if (!err) {
                        cb.apply(null, results);
                    }
                });
            }
        };

        Plugme.prototype.start = function (cb) {
            assert(this._registry.hasOwnProperty('start'), 'A start component must be declared before start is called');
            this._getOne('start', typeof cb === 'function' ? cb : function () {
                return null;
            });
        };

        Plugme.prototype.isLoaded = function (name) {
            return this._registry.hasOwnProperty(name) && this._registry[name].cache !== undefined;
        };

        Plugme.prototype._setFactory = function (name, deps, factory) {
            deps.forEach(function (value) {
                assert(typeof value === 'string', 'Dependencies must be an array of string');
            });
            this._registry[name] = {
                factory: factory,
                deps: deps,
                hasBeginLoading: false,
                callbacks: []
            };
        };

        Plugme.prototype._getOne = function (name, cb) {
            var _this = this;
            if (this._registry.hasOwnProperty(name)) {
                if (this._registry[name].cache !== undefined) {
                    cb(null, this._registry[name].cache);
                } else {
                    this._create(name, function () {
                        cb(null, _this._registry[name].cache);
                    });
                }
            } else {
                this._emitError(new Error('Component ' + name + 'does not exist'));
            }
        };

        Plugme.prototype._setScalar = function (name, value) {
            this._registry[name] = {};
            this._registry[name].cache = value;
        };

        Plugme.prototype._setDictionary = function (dictionary) {
            var _this = this;
            Object.keys(dictionary).forEach(function (key) {
                _this._setScalar(key, dictionary[key]);
            });
        };

        Plugme.prototype._emitError = function (ex) {
            var _this = this;
            this._errorHandlers.forEach(function (handler) {
                if (handler.once) {
                    _this.offError(handler);
                }
                handler(ex);
            });
        };

        Plugme.prototype._create = function (name, cb) {
            var _this = this;
            this._registry[name].callbacks.push(cb);
            if (this._registry[name].hasBeginLoading) {
                return;
            }
            this._registry[name].hasBeginLoading = true;
            async.map(this._registry[name].deps, this._getOne.bind(this), function (err, dependencies) {
                var alreadyReturned, returnFunction, value, timeout, hasTimeout;
                if (err) {
                    _this._emitError(err);
                }
                alreadyReturned = false;
                timeout = setTimeout(function () {
                    hasTimeout = true;
                    _this._emitError(new Error('Timeout for component: ' + name));
                }, _this.timeout);
                returnFunction = function (result) {
                    if (hasTimeout) {
                        return;
                    }
                    clearTimeout(timeout);
                    assert(!alreadyReturned, 'Factory must not call the return callback and return a value other than undefined: ' + name);
                    alreadyReturned = true;
                    _this._registry[name].cache = result;
                    _this._registry[name].callbacks.forEach(function (cb) {
                        cb();
                    });
                    _this._registry[name].callbacks.length = 0;
                };
                dependencies.push(returnFunction);
                try  {
                    value = _this._registry[name].factory.apply(_this, dependencies);
                    if (value !== undefined) {
                        returnFunction(value);
                    }
                } catch (ex) {
                    _this._registry[name].hasBeginLoading = false;
                    _this._emitError(ex);
                }
            });
        };
        return Plugme;
    })();
    plugme.Plugme = Plugme;
})(plugme || (plugme = {}));

module.exports = plugme;
