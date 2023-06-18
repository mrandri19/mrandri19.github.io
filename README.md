# mrandri19's blog

## Architecture

-   every html or markdown file in src has a corresponding directory in assets
    -   i.e. index.html has assets/index
    -   i.e. blog/index.html has assets/blog/index
-   every directory in assets optionally contains css, img, js, font, pdf
    -   i.e. index.html has assets/index/{css, fonts, img, pdf}
-   common assets, i.e. shared between pages, live in /assets/common/{css, fonts, img, pdf}
-   any exceptions to this is tech debt

## TODO

-   fix all blog posts
-   common.css
-   index.css

## Development

**Building**

```shell
tput reset && TRACE=1 ./build.sh
```

**Serving locally**

```shell
python3.9 -m http.server -d _site
```
