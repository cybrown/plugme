var Plugme = require('../index');
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
