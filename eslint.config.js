// @ts-check

import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';


export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    'rules': {
      // ignore unused vars with _ prefix
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    }
  },
)