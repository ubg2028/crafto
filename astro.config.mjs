import { defineConfig } from 'astro/config';

// GitHub Pages par deploy karna ho to neeche site/base uncomment karke apna username/repo daalein:
// site: 'https://USERNAME.github.io',
// base: '/REPO-NAME',
export default defineConfig({
  output: 'static',
});
