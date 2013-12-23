var async = require('async');

var Plugme = function () {
    this.registry = {};
    this.components = {};
    this.pendingCallbacks = {};
};

Plugme.prototype.set = function (name, pDepsOrFactory, pFactory) {
    var deps, factory;
    if (pFactory !== undefined) {
        factory = pFactory;
        deps = pDepsOrFactory;
    }
    else {
        factory = pDepsOrFactory;
        deps = [];
    }
    if (typeof factory === 'function') {
        this.setFactory(name, deps, factory);
    } else {
        this.setScalar(name, factory);
    }
};

Plugme.prototype.setFactory = function (name, deps, factory) {
    this.registry[name] = {
        factory: factory,
        deps: deps,
        canBeCreated: true
    };
};

Plugme.prototype.setScalar = function (name, value) {
    this.components[name] = value;
};

Plugme.prototype.get = function (pNameOrDeps, cb) {
    if (typeof pNameOrDeps === 'string') {
        this.getOne(pNameOrDeps, cb);
    } else {
        async.map(pNameOrDeps, this.getOne.bind(this), function (err, results) {
            cb.apply(err, results);
        });
    }
};

Plugme.prototype.getOne = function (name, cb) {
    var that = this;
    if (that.components.hasOwnProperty(name)) {
        cb(null, that.components[name]);
    } else if (that.registry.hasOwnProperty(name)) {
        that.create(name, function () {
            cb(null, that.components[name]);
        });
    } else {
        cb(new Error('Component ' + name + 'does not exist'));
    }
};

Plugme.prototype.addPendingCallback = function (name, cb) {
    if (!this.pendingCallbacks.hasOwnProperty(name)) {
        this.pendingCallbacks[name] = [];
    }
    this.pendingCallbacks[name].push(cb);
};

Plugme.prototype.create = function (name, cb) {
    var that = this;
    if (this.registry[name].canBeCreated != true) {
        this.addPendingCallback(name, cb);
        return;
    }
    this.registry[name].canBeCreated = false;
    async.map(this.registry[name].deps, this.getOne.bind(this), function (err, dependencies) {
        dependencies.push(function (result) {
            that.components[name] = result;
            cb();
            if (that.pendingCallbacks.hasOwnProperty(name)) {
                for (var index in that.pendingCallbacks[name]) {
                    that.pendingCallbacks[name][index]();
                }
            }
        });
        that.registry[name].factory.apply(this, dependencies);
    });
};

Plugme.prototype.isLoaded = function (name) {
    return this.components.hasOwnProperty(name);
};

module.exports = Plugme;
