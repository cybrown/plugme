module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-jslint');

    grunt.initConfig({
        mochacli: {
            options: {
                reporter: 'spec',
                require: ['should']
            },
            all: ['test/']
        },
        jslint: {
            all: {
                src: ['index.js'],
                directives: {
                    node: true,
                    nomen: true
                }
            }
        }
    });

    grunt.registerTask('lint', ['jslint:all']);
    grunt.registerTask('test', ['mochacli:all']);
};
