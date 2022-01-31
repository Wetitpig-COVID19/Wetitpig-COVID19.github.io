#!/usr/bin/env sh

set -x

cpu_count=$(nproc 2>/dev/null || printf '2')

npx html-minifier --collapse-whitespace --use-short-doctype -o index.html index.html

find assets -name "*.css" | \
	xargs -P$cpu_count -I {} \
	sh -c "
		set -x;
		npx postcss {} --use autoprefixer --replace;
		npx cleancss -o {} {};
	"

find assets -name "*.js" | \
	xargs -P$cpu_count -I {} \
	sh -c "
		set -x;
		npx uglifyjs {} -cmo {};
	"
