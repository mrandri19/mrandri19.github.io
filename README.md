# mrandri19's blog

## Building

### Blog

```shell
# Use rvm to install ruby2.7 (needed for jekyll 3.9, which is required by github-pages 219)
rvm install 2.7
# Set ruby2.7 as default
rvm --default 2.7
# Use ruby2.7 in this shell
rvm use 2.7

cd mrandri19.github.io
# Download dependencies described in Gemfile and update Gemfile.lock
bundle install
# Serve the website, reloading on changes
bundle exec jekyll serve --livereload
```

### Homepage

> TODO(Andrea): explain tailwind setup

```shell
# install tailwindcss (needed only once)
npm i tailwindcss
# rebuild the css on changes
npx tailwindcss -i index-style.css -o index-style.out.css --watch
```
