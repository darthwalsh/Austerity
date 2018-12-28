module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": ["eslint:recommended", "google"],
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "linebreak-style": "off",
        "require-jsdoc": "off",
        "quotes": ["error", "double"],

        /* //TODO fix these */
        "block-spacing": "off",
        "comma-dangle": "off",
        "comma-spacing": "off",
        "guard-for-in": "off",
        "indent": "off",
        "no-multi-spaces": "off",
        "no-redeclare": "off",
        "object-curly-spacing": "off",
        "one-var": "off",
        "padded-blocks": "off",
        "prefer-rest-params": "off",
        "semi-spacing": "off",
        "space-before-blocks": "off",
        "space-before-function-paren": "off",
        "spaced-comment": "off",
        "no-undef": "off",
        "curly": "off",
        "keyword-spacing": "off",
        "key-spacing": "off",
        "no-invalid-this": "off",
        "brace-style": "off",
        "max-len": "off",
        "no-console": "off",
        "arrow-parens": "off",
        "eol-last": "off",
        "no-var": "off"
    }
};
