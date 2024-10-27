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
: ${libraries?"kotlin stdlib-js (-l) is required"}

cat $input

kotlinc-js \
  $input \
  -ir-output-name transpiled \
  -ir-output-dir klib/ \
  -libraries $libraries \
  -Xreport-all-warnings \
  -Xuse-fir-extended-checkers \
  -Xir-only \
  -Xir-produce-klib-dir

kotlinc-js \
  -Xinclude=klib/ \
  -ir-output-name transpiled \
  -ir-output-dir $output \
  -libraries $libraries \
  -Xreport-all-warnings \
  -Xuse-fir-extended-checkers \
  -Xir-only \
  -Xir-produce-js \
  -Xir-dce