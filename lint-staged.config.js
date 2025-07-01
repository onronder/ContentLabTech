module.exports = {
  "*.{js,jsx,ts,tsx}": [
    filenames => {
      // Exclude scripts folder from ESLint but include Prettier
      const eslintFiles = filenames.filter(file => !file.includes("scripts/"));
      const prettierFiles = filenames;

      const commands = [];
      if (eslintFiles.length > 0) {
        commands.push(`eslint --fix ${eslintFiles.join(" ")}`);
      }
      if (prettierFiles.length > 0) {
        commands.push(`prettier --write ${prettierFiles.join(" ")}`);
      }

      return commands;
    },
  ],
  "*.{json,md,mdx,css,html,yml,yaml}": ["prettier --write"],
};
