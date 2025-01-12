#!/bin/bash

sourcemap=false

while getopts i:o:l:m flag
do
    case "${flag}" in
        i) input=${OPTARG};;
        o) output=${OPTARG};;
        l) libraries=${OPTARG};;
        m) sourcemap=true;;
    esac
done

: ${input?"input (-i) is required"}
: ${output?"output (-o) is required"}
: ${libraries?"kotlin stdlib-js and kotlinx coroutines-core-js (-l) are required"}

input_dir=$(dirname "$input")

kotlinc-js \
  $input \
  -ir-output-name transpiled \
  -ir-output-dir klib/ \
  -libraries $libraries \
  -Xreport-all-warnings \
  -Xir-produce-klib-dir

[ -d "klib/" ] || { exit 1; }

cmd=(kotlinc-js
  -Xinclude=klib/
  -ir-output-name transpiled
  -ir-output-dir "$output"
  -libraries "$libraries"
  -module-kind plain
  -main noCall
  -nowarn
  -Xir-produce-js
  -Xir-dce)
if [ "$sourcemap" = true ]; then
  cmd+=(-source-map
        -source-map-names-policy fully-qualified-names
        -source-map-base-dirs "$input_dir")
fi
"${cmd[@]}"
