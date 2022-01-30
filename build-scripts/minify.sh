#!/usr/bin/env sh

set -x

cpu_count=$(nproc 2>/dev/null || printf '2')

node_modules/html-minifier/cli.js --collapse-whitespace --use-short-doctype -o index.html index.html

find assets -name "*.css" | \
	xargs -P$cpu_count -I {} \
	sh -c "set -x; node_modules/clean-css-cli/bin/cleancss -o {} {}"

find assets -name "*.js" | \
	xargs -P$cpu_count -I {} \
	sh -c "set -x; node_modules/uglify-js/bin/uglifyjs {} -cmo {}"
