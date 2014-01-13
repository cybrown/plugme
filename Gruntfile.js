module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-clean');

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
        },
        typescript: {
            base: {
                src: ['src/**/*.ts'],
                dest: 'js/',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    base_path: 'src/',
                    sourcemap: true,
                    declaration: true
                }
            },
            build: {
                src: ['src/**/*.ts'],
                dest: 'js/',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    base_path: 'src/',
                    sourcemap: false,
                    declaration: false
                }
            }
        },
        clean: ["js"]
    });

    grunt.registerTask('lint', ['jslint:all']);
    grunt.registerTask('ts',   ['typescript']);
    grunt.registerTask('test', ['clean', 'ts', 'mochacli:all']);
    grunt.registerTask('build',   ['typescript:build']);
};
