module.exports = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write", "git add"],
  "*.{json,md,mdx,css,html,yml,yaml}": ["prettier --write", "git add"],
};
