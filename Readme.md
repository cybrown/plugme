Plugme [![Build Status](https://travis-ci.org/cybrown/plugme.png?branch=master)](https://travis-ci.org/cybrown/plugme)
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

## LICENCE
(The MIT License)

Copyright (c) 2009-2013 Cy Brown <cy.brown59@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.