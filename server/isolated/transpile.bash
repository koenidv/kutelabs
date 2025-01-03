#!/bin/bash

while getopts i:o:l: flag
do
    case "${flag}" in
        i) input=${OPTARG};;
        o) output=${OPTARG};;
        l) libraries=${OPTARG};;
    esac
done

: ${input?"input (-i) is required"}
: ${output?"output (-o) is required"}
: ${libraries?"kotlin stdlib-js and kotlinx coroutines-core-js (-l) are required"}

kotlinc-js \
  $input \
  -ir-output-name transpiled \
  -ir-output-dir klib/ \
  -libraries $libraries \
  -main noCall \
  -Xreport-all-warnings \
  -Xir-produce-klib-dir

kotlinc-js \
  -Xinclude=klib/ \
  -ir-output-name transpiled \
  -ir-output-dir $output \
  -libraries $libraries \
  -main noCall \
  -nowarn \
  -Xir-produce-js \
  -Xir-dce