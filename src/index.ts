/// <reference path="./defs/async/async" />
import async = require("async");

module plugme {

    var assert = function (condition: boolean, description: string) {
        if (!condition) {
            throw new Error(description);
        }
    };
    
    /**
     * Dependency container and injection class
     * @constructor
     */
    export class Plugme {
        private _registry = {};
        private _errorHandlers = [];
        private timeout = 10000;

        /**
         * Set an error handler
         * @param  {Function} cb
         */
        onError (cb) {
            this._errorHandlers.push(cb);
        }

        /**
         * Set an error handler only once
         * @param  {Function} cb
         */
        onceError (cb) {
            cb.once = true;
            this._errorHandlers.push(cb);
        }

        /**
         * Unset an error handler
         * @param  {Function} cb
         */
        offError (cb) {
            var index = this._errorHandlers.indexOf(cb);
            if (index !== -1) {
                this._errorHandlers.splice(index, 1);
            }
        }

        /**
         * Set a new component
         * @param {String} name Name of the component
         * @param {String | String[] | Function} pDepsOrFactory Dependencies or factory function for the component
         * @param {Function} [pFactory] Factory function
         */
        set (pNameOrDict, pDepsOrFactory, pFactory) {
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
        }

        /**
         * Get components from the registry and execute the callback
         * @param  {String | String[]}   pNameOrDeps
         * @param  {Function} cb
         */
        get (pNameOrDeps, cb) {
            if (typeof pNameOrDeps !== 'string') {
                pNameOrDeps.forEach(dep => {
                    assert(typeof dep === 'string', 'Plugme#set dependencies must be a string or an array of strings');
                });
            }
            if (typeof pNameOrDeps === 'string') {
                this._getOne(pNameOrDeps, (err, ret) => {
                    if (!err) {
                        cb(ret);
                    }
                });
            } else {
                async.map(pNameOrDeps, this._getOne.bind(this), (err, results) => {
                    if (!err) {
                        cb.apply(null, results);
                    }
                });
            }
        }

        /**
         * Start the application
         * @param  {Function} [cb] Function to call after the application is ready
         */
        start (cb) {
            assert(this._registry.hasOwnProperty('start'), 'A start component must be declared before start is called');
            this._getOne('start', typeof cb === 'function' ? cb : function () {
                return null;
            });
        }

        /**
         * Return true if a component is already available
         * @param  {String}  name
         * @return {Boolean} true if component is available
         */
        isLoaded (name) {
            return this._registry.hasOwnProperty(name) && this._registry[name].cache !== undefined;
        }

        /**
         * Set a new factory in the component registry
         * @private
         * @param {String} name
         * @param {String[]} deps
         * @param {Function} factory
         */
        _setFactory (name, deps, factory) {
            deps.forEach(value => {
                assert(typeof value === 'string', 'Dependencies must be an array of string');
                assert(value !== 'start', 'start component must not be a dependency, choose another name')
            });
            this._registry[name] = {
                factory: factory,
                deps: deps,
                hasBeginLoading: false,
                callbacks: []
            };
        }

        /**
         * Get one dependency and inject it in the callback
         * @private
         * @param  {String}   name
         * @param  {Function} cb
         */
        _getOne (name, cb) {
            if (this._registry.hasOwnProperty(name)) {
                if (this._registry[name].cache !== undefined) {
                    cb(null, this._registry[name].cache);
                } else {
                    this._create(name, () => {
                        cb(null, this._registry[name].cache);
                    });
                }
            } else {
                this._emitError(new Error('Component ' + name + 'does not exist'));
            }
        }

        /**
         * Set a new scalar value in the registry
         * @private
         * @param {String} name
         * @param {Any} value
         */
        _setScalar (name, value) {
            this._registry[name] = {};
            this._registry[name].cache = value;
        }

        /**
         * Set multiple scalar values from a dictionary
         * @param dictionary
         * @private
         */
        _setDictionary (dictionary) {
            Object.keys(dictionary).forEach(key => {
                this._setScalar(key, dictionary[key]);
            });
        }

        /**
         * Emit an error
         * @param ex
         * @private
         */
        _emitError (ex) {
            this._errorHandlers.forEach(handler => {
                if (handler.once) {
                    this.offError(handler);
                }
                handler(ex);
            });
        }

        /**
         * Create a new lazy loaded component from factory
         * @private
         * @param  {String}   name
         * @param  {Function} cb
         */
        _create (name, cb) {
            this._registry[name].callbacks.push(cb);
            if (this._registry[name].hasBeginLoading) {
                return;
            }
            this._registry[name].hasBeginLoading = true;
            async.map(this._registry[name].deps, this._getOne.bind(this), (err, dependencies) => {
                var alreadyReturned, returnFunction, value, timeout, hasTimeout;
                if (err) {
                    this._emitError(err);
                }
                alreadyReturned = false;
                if (name !== 'start') {
                    timeout = setTimeout(() => {
                        hasTimeout = true;
                        this._emitError(new Error('Timeout for component: ' + name));
                    }, this.timeout);
                }
                returnFunction = (result) => {
                    if (hasTimeout) {
                        return;
                    }
                    clearTimeout(timeout);
                    assert(!alreadyReturned, 'Factory must not call the return callback and return a value other than undefined: ' + name);
                    alreadyReturned = true;
                    this._registry[name].cache = result;
                    this._registry[name].callbacks.forEach(cb => {
                        cb();
                    });
                    this._registry[name].callbacks.length = 0;
                };
                dependencies.push(returnFunction);
                try {
                    value = this._registry[name].factory.apply(this, dependencies);
                    if (value !== undefined) {
                        returnFunction(value);
                    }
                } catch (ex) {
                    this._registry[name].hasBeginLoading = false;
                    this._emitError(ex);
                }
            });
        }
    }
}

export = plugme;
