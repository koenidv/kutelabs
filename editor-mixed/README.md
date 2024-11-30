# kutelabs mixed content editor

The mixed content editor (MCE) will be a block-based drag-and-drop code editor.

some useful commands:
generate editor.d.ts: bunx json2ts editor.schema.json editor.d.ts --no-style.semi
forward local port: socat TCP-LISTEN:8080,fork TCP:localhost:4321