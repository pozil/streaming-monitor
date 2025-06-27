'use strict';

const { defineConfig } = require('eslint/config');
const eslintJs = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');
const salesforceLwcConfig = require('@salesforce/eslint-config-lwc/recommended');
const globals = require('globals');

module.exports = defineConfig([
    // Global ignores
    {
        ignores: [
            'src/main/default/staticresources/**', // Ignore third party libraries
            'src/test/jest-mocks/lightning/modal.js' // Ignore modal mock as it contains decorators (unsupported by ESLint)
        ]
    },

    // LWC configuration for src/main/default/lwc
    {
        files: ['src/main/default/lwc/**/*.js'],
        extends: [salesforceLwcConfig]
    },

    // LWC configuration with override for LWC test files
    {
        files: ['src/main/default/lwc/**/*.test.js'],
        extends: [salesforceLwcConfig],
        rules: {
            '@lwc/lwc/no-unexpected-wire-adapter-usages': 'off'
        },
        languageOptions: {
            globals: {
                ...globals.node
            }
        }
    },

    // Jest mocks configuration
    {
        files: ['src/test/jest-mocks/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: {
                ...globals.node,
                ...globals.es2021,
                ...jestPlugin.environments.globals.globals,
                CustomEvent: 'readonly',
                window: 'readonly'
            }
        },
        plugins: {
            eslintJs
        },
        extends: ['eslintJs/recommended']
    }
]);
