# mrandri19's blog

## Building

### Development

```shell
npm install
npm run dev
```

### Production build

```shell
npm run build
```

Output goes to `./dist/`.

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
