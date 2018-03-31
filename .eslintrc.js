module.exports = {
  parser: 'typescript-eslint-parser',
  extends: "eslint-config-alloy/typescript",
  env: {
    node: true
  },
  rules: {
    "no-console": "off",
    eqeqeq: [
      'error',
      'always',
      {
        null: 'ignore'
      }
    ],
    'typescript/class-name-casing': 'error'
  }
}