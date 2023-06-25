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

```shell
# install tailwindcss (needed only once)
npm i tailwindcss
# rebuild the css on changes
npx tailwindcss -i index-style.css -o index-style.out.css --watch
```

### Converting notebooks to markdown

```shell
pandoc \
    --from ipynb \
    --to gfm-raw_html+raw_attribute \
    --output 05-introduction-to-variational-inference.md \
    --standalone \
    --extract-media=assets/images/introduction-to-variational-inference \
    05-introduction-to-variational-inference.ipynb
```

### Installing ruby and running bundle on ARM64 macs

```shell
brew install openssl@1.1

export PATH="$(brew --prefix)/opt/openssl@1.1/bin:$PATH"
export LDFLAGS="-L$(brew --prefix)/opt/openssl@1.1/lib"
export CPPFLAGS="-I$(brew --prefix)/opt/openssl@1.1/include"
export PKG_CONFIG_PATH="$(brew --prefix)/opt/openssl@1.1/lib/pkgconfig"

rvm autolibs disable

export RUBY_CFLAGS=-DUSE_FFI_CLOSURE_ALLOC
export optflags="-Wno-error=implicit-function-declaration"

rvm install 2.7.3 --with-openssl-dir=$(brew --prefix)/opt/openssl@1.1
```
