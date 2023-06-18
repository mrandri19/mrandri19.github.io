#!/usr/bin/env bash

# https://sharats.me/posts/shell-script-best-practices/
set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then set -o xtrace; fi

BUILD_DIR="_site"

rm -rf "$BUILD_DIR" && mkdir "$BUILD_DIR"

cp index.html "$BUILD_DIR"

cp -r blog "$BUILD_DIR"

cp -r assets "$BUILD_DIR"
