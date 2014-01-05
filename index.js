'use strict';
var async = require('async');

/**
 * Dependency container and injection class
 * @constructor
 */
var Plugme = function () {
    this._registry = {};
    this._components = {};
    this._pendingCallbacks = {};
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
    var name, dict, deps, factory, i;
    if (typeof pNameOrDict === 'string') {
        name = pNameOrDict;
        if (pFactory !== undefined) {
            factory = pFactory;
            deps = pDepsOrFactory;
        } else {
            factory = pDepsOrFactory;
            deps = [];
        }
        if (typeof deps !== 'string') {
            deps.forEach(function (dep) {
                if (typeof dep !== 'string') {
                    throw new Error('Plugme#set dependencies must be a string or an array of strings');
                }
            });
        }
        if (typeof factory === 'function') {
            this._setFactory(name, deps, factory);
        } else {
            this._setScalar(name, factory);
        }
    } else {
        dict = pNameOrDict;
        if (typeof dict !== 'object') {
            throw new Error('Plugme#set first argument must be a string or a plain object');
        }
        for (i in dict) {
            if (dict.hasOwnProperty(i)) {
                this.set(i, dict[i]);
            }
        }
    }
};

/**
 * Get components from the registry and execute the callback
 * @param  {String | String[]}   pNameOrDeps
 * @param  {Function} cb
 */
Plugme.prototype.get = function (pNameOrDeps, cb) {
    var _this = this;
    if (typeof pNameOrDeps !== 'string') {
        pNameOrDeps.forEach(function (dep) {
            if (typeof dep !== 'string') {
                throw new Error('Plugme#set dependencies must be a string or an array of strings');
            }
        });
    }
    if (typeof pNameOrDeps === 'string') {
        this._getOne(pNameOrDeps, function (err, ret) {
            if (err) {
                _this._emitError(new Error('Component ' + pNameOrDeps + 'does not exist'));
            } else {
                cb(ret);
            }
        });
    } else {
        async.map(pNameOrDeps, this._getOne.bind(this), function (err, results) {
            if (err) {
                _this._emitError(new Error('Component ' + pNameOrDeps + 'does not exist'));
            } else {
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
    return this._components.hasOwnProperty(name);
};

// PRIVATE

/**
 * Get one dependency and inject it in the callback
 * @private
 * @param  {String}   name
 * @param  {Function} cb
 */
Plugme.prototype._getOne = function (name, cb) {
    var that = this;
    if (that._components.hasOwnProperty(name)) {
        cb(null, that._components[name]);
    } else if (that._registry.hasOwnProperty(name)) {
        that._create(name, function () {
            cb(null, that._components[name]);
        });
    } else {
        cb(new Error('Component ' + name + 'does not exist'), null);
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
    this._registry[name] = {
        factory: factory,
        deps: deps,
        canBeCreated: true
    };
};

/**
 * Set a new scalar value in the registry
 * @private
 * @param {String} name
 * @param {Any} value
 */
Plugme.prototype._setScalar = function (name, value) {
    this._components[name] = value;
};

/**
 * Add a callback for a loading dependency
 * @private
 * @param {String}   name
 * @param {Function} cb
 */
Plugme.prototype._addPendingCallback = function (name, cb) {
    if (!this._pendingCallbacks.hasOwnProperty(name)) {
        this._pendingCallbacks[name] = [];
    }
    this._pendingCallbacks[name].push(cb);
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

/**
 * Create a new lazy loaded component from factory
 * @private
 * @param  {String}   name
 * @param  {Function} cb
 */
Plugme.prototype._create = function (name, cb) {
    var that = this;
    if (this._registry[name].canBeCreated !== true) {
        this._addPendingCallback(name, cb);
        return;
    }
    this._registry[name].canBeCreated = false;
    async.map(this._registry[name].deps, this._getOne.bind(this), function (err, dependencies) {
        var alreadyReturned, returnFunction, value, timeout, hasTimeout;
        if (err) {
            cb(err);
        }
        alreadyReturned = false;
        timeout = setTimeout(function () {
            hasTimeout = true;
            that._emitError(new Error('Timeout for component: ' + name));
        }, that.timeout);
        returnFunction = function (result) {
            var index;
            if (hasTimeout) {
                return;
            }
            clearTimeout(timeout);
            if (alreadyReturned) {
                //this._emitError(new Error('Factory must not call the return callback and return a value other than undefined: ' + name));
                throw new Error('Factory must not call the return callback and return a value other than undefined: ' + name);
            }
            alreadyReturned = true;
            that._components[name] = result;
            cb();
            if (that._pendingCallbacks.hasOwnProperty(name)) {
                for (index in that._pendingCallbacks[name]) {
                    if (that._pendingCallbacks[name].hasOwnProperty(index)) {
                        that._pendingCallbacks[name][index]();
                    }
                }
            }
        };
        dependencies.push(returnFunction);
        try {
            value = that._registry[name].factory.apply(this, dependencies);
            if (value !== undefined) {
                returnFunction(value);
            }
        } catch (ex) {
            that._registry[name].canBeCreated = true;
            that._emitError(ex);
        }
    });
};

module.exports = Plugme;
