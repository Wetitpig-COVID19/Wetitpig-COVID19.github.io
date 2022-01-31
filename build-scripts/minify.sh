#!/usr/bin/env sh

set -v

cpu_count=$(nproc 2>/dev/null || printf '2')

minifiedHTML=$(npx html-minifier --collapse-whitespace --use-short-doctype index.html | sed 's%<script type="text/javascript" src="assets/js.*</head>%<script type="text/javascript" src="assets/js/bundle.js"></script></head>%g')
printf '%s\n%s\n%s\n' \
	'---' '---' \
	"${minifiedHTML}" \
	> index.html

npx postcss assets/css --use autoprefixer -r
npx cleancss -O2 -b --batch-suffix '' $(find assets -name "*.css")

npx uglifyjs -cmo assets/js/bundle.js $(find assets -name "*.js")
