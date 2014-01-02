Plugme
======

Simple asynchronous dependency container and injector.

## Installation

	$ npm install plugme

## Quick start
```
var Plugme = require('plugme');
var plug = new Plugme();

// Set configuration values
plug.set('adminLogin', 'admin');
plug.set('adminPassword', 'admin');

// Set the function to authenticate, using configuration values
plug.set('authenticate', ['adminLogin', 'adminPassword'], function (adminLogin, adminPassword, done) {
	var authenticate = function (login, password, cb) {
		if (login === adminLogin && password === adminPassword) {
			cb(null, true);
		} else {
			cb(null, false);
		}
	};
	done(authenticate);
});

// Use the authenticate function in application code
plug.get(['authenticate'], function (authenticate) {
	authenticate('foo', 'bar', function (err, isAuthenticated) {
		console.log('Is authenticated:', isAuthenticated);
	});
	authenticate('admin', 'admin', function (err, isAuthenticated) {
		console.log('Is authenticated:', isAuthenticated);
	});
});
```

## Features

  * AMD like component definition
  * Define asynchronous components
  * Components creation can be asynchronous
  * Contains simple values for configuration purpose
  * Components are not tied to file system (different from requirejs)