#!/usr/bin/env sh

set -x

zstFiles=$(ls -1 assets/maps/*.zst 2>/dev/null | wc -l)

if [ $zstFiles = 0 ]; then
	find assets/maps -name "*.json" -exec zstdmt -17 {} \;
fi

if [ $(ls -1 assets/maps/*.json | wc -l) != $(wc -l < assets/data/checksum.txt) ] || [ $(sha256sum -c --status assets/data/checksum.txt; printf $?) != 0 ]; then
	find assets/data -name "*.json" -exec zstdmt -17 {} \;
fi

rm assets/data/checksum.txt
