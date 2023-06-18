#!/usr/bin/env bash

# https://sharats.me/posts/shell-script-best-practices/
set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then set -o xtrace; fi

BUILD_DIR="_site"
SOURCE_DIR="src"

rm -rf "$BUILD_DIR" && mkdir "$BUILD_DIR"

cp "$SOURCE_DIR"/index.html "$BUILD_DIR"
cp "$SOURCE_DIR"/404.html "$BUILD_DIR"
cp "$SOURCE_DIR"/hes_my_quant.pdf "$BUILD_DIR"

cp -r "$SOURCE_DIR"/blog "$BUILD_DIR"

cp -r "$SOURCE_DIR"/assets "$BUILD_DIR"
