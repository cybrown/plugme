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
};

/**
 * Set a new component
 * @param {String} name Name of the component
 * @param {String | String[] | Function} pDepsOrFactory Dependencies or factory function for the component
 * @param {Function} [pFactory] Factory function
 */
Plugme.prototype.set = function (name, pDepsOrFactory, pFactory) {
    var deps, factory;
    if (pFactory !== undefined) {
        factory = pFactory;
        deps = pDepsOrFactory;
    } else {
        factory = pDepsOrFactory;
        deps = [];
    }
    if (typeof name !== 'string') {
        throw new Error('Plugme#set name must be a string');
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
};

/**
 * Get components from the registry and execute the callback
 * @param  {String | String[]}   pNameOrDeps
 * @param  {Function} cb
 */
Plugme.prototype.get = function (pNameOrDeps, cb) {
    if (typeof pNameOrDeps !== 'string') {
        pNameOrDeps.forEach(function (dep) {
            if (typeof dep !== 'string') {
                throw new Error('Plugme#set dependencies must be a string or an array of strings');
            }
        });
    }
    if (typeof pNameOrDeps === 'string') {
        this._getOne(pNameOrDeps, cb);
    } else {
        async.map(pNameOrDeps, this._getOne.bind(this), function (err, results) {
            cb.apply(err, results);
        });
    }
};

Plugme.prototype.start = function (name) {
    this._getOne(name, function (err, next) {
        next(err);
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
        cb(new Error('Component ' + name + 'does not exist'));
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
        if (err) {
            cb(err);
        }
        dependencies.push(function (result) {
            var index;
            that._components[name] = result;
            cb();
            if (that._pendingCallbacks.hasOwnProperty(name)) {
                for (index in that._pendingCallbacks[name]) {
                    if (that._pendingCallbacks[name].hasOwnProperty(index)) {
                        that._pendingCallbacks[name][index]();
                    }
                }
            }
        });
        that._registry[name].factory.apply(this, dependencies);
    });
};

module.exports = Plugme;
