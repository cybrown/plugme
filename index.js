'use strict';
var async = require('async');

var assert = function (condition, description) {
    if (!condition) {
        throw new Error(description);
    }
};

/**
 * Dependency container and injection class
 * @constructor
 */
var Plugme = function () {
    this._registry = {};
    this._errorHandlers = [];
    this.timeout = 10000;
};

/**
 * Set an error handler
 * @param  {Function} cb
 */
Plugme.prototype.onError = function (cb) {
    this._errorHandlers.push(cb);
};

/**
 * Set an error handler only once
 * @param  {Function} cb
 */
Plugme.prototype.onceError = function (cb) {
    cb.once = true;
    this._errorHandlers.push(cb);
};

/**
 * Unset an error handler
 * @param  {Function} cb
 */
Plugme.prototype.offError = function (cb) {
    var index = this._errorHandlers.indexOf(cb);
    if (index !== -1) {
        this._errorHandlers.splice(index, 1);
    }
};

/**
 * Set a new component
 * @param {String} name Name of the component
 * @param {String | String[] | Function} pDepsOrFactory Dependencies or factory function for the component
 * @param {Function} [pFactory] Factory function
 */
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

/**
 * Get components from the registry and execute the callback
 * @param  {String | String[]}   pNameOrDeps
 * @param  {Function} cb
 */
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

/**
 * Start the application
 * @param  {Function} cb Function to call after the application is ready
 */
Plugme.prototype.start = function (cb) {
    if (!this._registry.hasOwnProperty('start')) {
        throw new Error('A start component must be declared before start is called');
    }
    this._getOne('start', typeof cb === 'function' ? cb : function () {
        return null;
    });
};

/**
 * Return true if a component is already available
 * @param  {String}  name
 * @return {Boolean} true if component is available
 */
Plugme.prototype.isLoaded = function (name) {
    return this._registry.hasOwnProperty(name) && this._registry[name].cache !== undefined;
};

// PRIVATE

/**
 * Get one dependency and inject it in the callback
 * @private
 * @param  {String}   name
 * @param  {Function} cb
 */
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

/**
 * Set a new factory in the component registry
 * @private
 * @param {String} name
 * @param {String[]} deps
 * @param {Function} factory
 */
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

/**
 * Set a new scalar value in the registry
 * @private
 * @param {String} name
 * @param {Any} value
 */
Plugme.prototype._setScalar = function (name, value) {
    this._registry[name] = {};
    this._registry[name].cache = value;
};

/**
 * Set multiple scalar values from a dictionary
 * @param dictionary
 * @private
 */
Plugme.prototype._setDictionary = function (dictionary) {
    var _this = this;
    Object.keys(dictionary).forEach(function (key) {
        _this._setScalar(key, dictionary[key]);
    });
};

/**
 * Emit an error
 * @param ex
 * @private
 */
Plugme.prototype._emitError = function (ex) {
    var _this = this;
    this._errorHandlers.forEach(function (handler) {
        if (handler.once) {
            _this.offError(handler);
        }
        handler(ex);
    });
};

/**
 * Create a new lazy loaded component from factory
 * @private
 * @param  {String}   name
 * @param  {Function} cb
 */
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
        try {
            value = _this._registry[name].factory.apply(this, dependencies);
            if (value !== undefined) {
                returnFunction(value);
            }
        } catch (ex) {
            _this._registry[name].hasBeginLoading = false;
            _this._emitError(ex);
        }
    });
};

module.exports = Plugme;
