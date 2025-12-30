import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config(
  {
    files: ["**/*.{vue,js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
    ignores: ['*.d.ts', '**/coverage', '**/dist', '**/node_modules', ".gitignore"]
  },
  {
    extends: [
      ...typescriptEslint.configs.recommended,
      // ...eslintPluginVue.configs['flat/essential'],
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
        sourceType: 'module',
        extraFileExtensions: ['.vue'], // добавляем поддержку .vue файлов
      },
    },
    rules: {
      "space-in-parens": ["error", "never"],
      "space-infix-ops": ["error", { "int32Hint": false }],
      "arrow-spacing": ["error", { "before": true, "after": true }],
      "object-curly-spacing": ["error", "always"],
      'vue/html-indent': ['error', 4],
      'vue/script-indent': ['error', 4, { baseIndent: 0, "switchCase": 1, }],
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // eslintConfigPrettier
);