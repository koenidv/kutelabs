# kutelabs mixed content editor

The mixed content editor (MCE) will be a block-based drag-and-drop code editor.

some useful commands:
generate editor.d.ts: bunx json2ts editor.schema.json editor.d.ts --no-style.semi
forward local port: socat TCP-LISTEN:8080,fork TCP:localhost:4321

## cross-platform

- [x] Touch support
- [ ] Layout for narrow screens

## a11y

- [x] Moving around the workspace by keyboard
- [ ] Moving blocks by keyboard
- [ ] Logical tab order
- [ ] Explicitly focus input fields
- [ ] Useful screen reader announcements
- [ ] On-screen zoom buttons
- [ ] Cancel drag by pressing escape