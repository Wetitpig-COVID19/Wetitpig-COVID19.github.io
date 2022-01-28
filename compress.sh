#!/usr/bin/env sh

set -x

zstFiles=$(ls -1 assets/maps/*.zst | wc -l)

if [ $zstFiles = 0 ]; then
	find assets/maps -name "*.json" -exec zstdmt -17 {} \;
fi

find assets/data -name "*.json" -exec zstdmt -17 {} \;
