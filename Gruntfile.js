module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-mocha-cli');

    grunt.initConfig({
        mochacli: {
            options: {
                reporter: 'spec',
                require: ['should']
            },
            all: ['test/']
        }
    });

    grunt.registerTask('test', ['mochacli:all']);
};
