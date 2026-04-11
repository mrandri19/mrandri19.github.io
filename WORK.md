# Jekyll → Astro Migration

Executed the migration plan at `.claude/plans/indexed-weaving-wreath.md` on 2026-04-06.

## What was done

### Step 1 — Astro scaffold

- Created `astro.config.mjs` with static output, `build.format: 'file'`, Shiki dual-theme (catppuccin-latte/catppuccin-mocha), remark-math + rehype-katex plugins, and Tailwind integration
- Created `tailwind.config.mjs` (replaces `tailwind.config.js`) with updated content paths, `darkMode: 'media'`, and `@tailwindcss/typography` plugin
- Created `tsconfig.json` extending `astro/tsconfigs/strict`
- Updated `package.json` with Astro and all dependencies (`astro`, `@astrojs/tailwind`, `@astrojs/rss`, `@tailwindcss/typography`, `remark-math`, `rehype-katex`, `katex`)
- Created `src/content/config.ts` — content collection schema (title, author?, draft?)
- Created `src/styles/global.css` — Tailwind directives, Source Serif Pro `@font-face`, Shiki dark/light CSS variable overrides
- Moved assets to `public/`: `assets/images/`, `assets/js/`, `assets/pdf/`, `index-images/`, `Source_Serif_Pro/`, `Source_Sans_Pro/`, favicons, `manifest.json`, `site.webmanifest`, `hes_my_quant.pdf`

### Step 2 — Layouts

- `src/layouts/BaseLayout.astro` — shared HTML shell with title prop, favicons, GA4 analytics, dark mode body classes (`bg-white dark:bg-gray-900`)
- `src/layouts/PostLayout.astro` — extends BaseLayout; blog header nav (Blog/Homepage links), KaTeX CSS link in head, `<article class="prose dark:prose-invert font-serif">` wrapper, post title and formatted date

### Step 3 — Homepage

- `src/pages/index.astro` — identical HTML content to the original `index.html`, using BaseLayout for the shell. Homepage-specific CSS (section margins, clearfix, bullet styling) moved to an Astro `<style>` block. `index-style.out.css` link removed (Tailwind compiled at build time).

### Step 4 — Blog posts

All 12 posts copied from `_posts/` to `src/content/posts/` with these transformations:

| Transformation | Posts affected |
|---|---|
| Remove `layout: post` from frontmatter | All 12 |
| Replace `{% highlight lang %}…{% endhighlight %}` with fenced code blocks | npm (5 blocks), quadcopter (1 block) |
| Replace `{% post_url … %}` with hardcoded URLs | text-rendering-ep2 (3 occurrences) |
| Remove `{% raw %}`/`{% endraw %}` tags | bayesian-linear-regression |
| Strip client-side KaTeX/MathJax `<link>` and `<script>` tags | 7 math posts |
| Strip `# \| code-fold: true` Quarto comments | option-implied (9), volatility-smile (4) |
| Replace jupyter frontmatter with simple `title:` | one-dimensional-variational-inference |
| Normalize inline math: `$$x$$` → `$x$`, trim `$ x $` → `$x$` | All math posts |

### Step 5 — Blog listing, RSS, 404

- `src/pages/blog.astro` — queries content collection, sorts by date descending, renders date + title list
- `src/pages/[...slug].astro` — dynamic route; parses `YYYY-MM-DD-slug` filenames into `YYYY/MM/DD/slug` URL paths, preserving Jekyll's URL scheme
- `src/pages/feed.xml.js` — RSS feed via `@astrojs/rss`
- `src/pages/404.astro` — simple 404 page

### Step 7 — GitHub Actions

Replaced `.github/workflows/jekyll.yml` with an Astro deploy workflow: Node 20, `npm ci`, `npx astro build`, `actions/upload-pages-artifact` from `./dist`.

### Step 8 — Cleanup

Deleted Jekyll artifacts: `Gemfile`, `Gemfile.lock`, `_config.yml`, `_includes/`, `_layouts/`, `assets/main.scss`, `assets/katex/`, `blog.md`, `404.html`, `index.html`, `index-style.css`, `index-style.out.css`, `postcss.config.js`, `tailwind.config.js`.

Updated `.gitignore`: added `dist/`, `.astro/`, `_site/`; removed Jekyll-specific entries.

## Build result

```
15 page(s) built — no errors, no warnings
```

Pages built:
- `/index.html` — homepage
- `/blog.html` — post listing (12 posts, newest first)
- `/feed.xml` — RSS feed
- `/404.html` — 404 page
- `/YYYY/MM/DD/slug.html` — all 12 posts at original Jekyll URLs

## Technical issues encountered and fixed

**remark-math version bug** — remark-math v5 + mdast-util-math v2.0.2 crashed with `Cannot set properties of undefined (setting 'value')` in `exitMathText` for any post containing inline math. Fixed by upgrading to remark-math v6 (mdast-util-math v3).

**Inline `$$…$$` used for inline math** — Several posts used `$$x$$` inline (MathJax convention) which remark-math treats as display/block math. Converted to `$x$` with a Python script that preserves standalone `$$` block delimiters on their own lines.

**Spaces in inline math** — Posts had `$ x $` with leading/trailing spaces (invalid in remark-math's inline math syntax), causing parser stack corruption. Fixed by trimming: `$ x $` → `$x$`.

**Astro `entry.id` vs `entry.slug`** — `entry.id` in Astro content collections includes the `.md` extension, producing URLs like `…/post.md.html`. Fixed by using `entry.slug` everywhere, which strips the extension.

**Tailwind config dynamic import** — `await import('@tailwindcss/typography')` in the config caused a jiti (Tailwind's config loader) error. Fixed by using a static `import typography from '@tailwindcss/typography'` at the top of the file.
