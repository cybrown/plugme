Plugme [![Build Status](https://travis-ci.org/cybrown/plugme.png?branch=master)](https://travis-ci.org/cybrown/plugme)
======
Simple asynchronous dependency container and injector.

Define your components in functions, return them asynchronously, and inject them in other components.

No configuration file required, component definition based on anonymous functions as factories.

Inspired by requirejs, and angularjs factories.

## Installation

    $ npm install plugme

## Quick start

In this example, a function is a component to authenticate a user, and the default admin credentials are stored as value dependencies.

```js
var Plugme = require('plugme').Plugme;
var plug = new Plugme();

// Set configuration values
plug.set('adminLogin', 'admin');
plug.set('adminPassword', 'admin');

// Set the function to authenticate, using configuration values, equivalent to define
plug.set('authenticate', ['adminLogin', 'adminPassword'], function (adminLogin, adminPassword, done) {
    var authenticate = function (login, password, cb) {
        if (login === adminLogin && password === adminPassword) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    };
    done(authenticate); // The component is returned asynchronously, but a return statement can be used if synchronous
});

// Use the authenticate function in application code, equivalent to require
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
  * Components creation can be asynchronous
  * Contains simple values for configuration purpose
  * Components are not tied to file system (different from requirejs)
  * Build with typescript (not mandatory)

## Notes
"Introspection" (using .toString on a function and infer dependencies from arguments name) is not supported, since it does not support minification.

Typescript is not mandatory to use this library.

If you are familiar with requirejs, set is like define, and get is like require.

## Future

    * Add a scope concept (inject values depending on the current session, request etc...).
    * Create multiple set methods, for values, factories, services and providers.

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