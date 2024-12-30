#!/bin/bash

find $(git ls-files --cached --others --exclude-standard) -name "*.schema.json" | while read -r file; do
    dir=$(dirname "$file")
    schema_name=$(basename "$file" .schema.json)
    echo "Processing schema $schema_name"    
    cd "$dir" || continue
    bunx json2ts "${schema_name}.schema.json" "${schema_name}.d.ts" --no-style.semi
    cd - > /dev/null
done