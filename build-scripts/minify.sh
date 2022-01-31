#!/usr/bin/env sh

set -v

cpu_count=$(nproc 2>/dev/null || printf '2')

minifiedHTML=$(npx html-minifier --collapse-whitespace --use-short-doctype index.html)
printf '%s\n%s\n%s\n' \
	'---' '---' \
	"${minifiedHTML}" \
	> index.html

npx postcss assets/css --use autoprefixer -r
npx cleancss -O2 -b --batch-suffix '' $(find assets -name "*.css")

find assets -name "*.js" | \
	xargs -P$cpu_count -I {} \
	sh -vc '
		npx uglifyjs {} -cmo {};
	'
