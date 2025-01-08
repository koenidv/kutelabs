# kutelabs mixed content editor

The mixed content editor (MCE) will be a block-based drag-and-drop code editor.

some useful commands:
generate editor.d.ts: bunx json2ts editor.schema.json editor.d.ts --no-style.semi
forward local port: socat TCP-LISTEN:8080,fork TCP:localhost:4321

## cross-platform

- [x] Touch support
- [ ] Layout for narrow screens
- [ ] Safari compatibility

## a11y

- [x] Moving around the workspace by keyboard
- [x] Moving blocks by keyboard
- [x] Logical tab order
- [ ] Explicitly focus input fields
- [x] Useful screen reader announcements
- [x] On-screen zoom buttons
- [x] Cancel drag by pressing escape or touch cancelling
