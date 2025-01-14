# kutelabs mixed content editor

The mixed content editor (MCE) is a block-based drag-and-drop editor with custom code blocks.

## Usage

The editor is based on Lit and thus usable like any web component:

```html
<script type="module">
  import "./editor-mixed.js"
</script>

<editor-mixed></editor-mixed>
```

## Technical Structure

![Technical Structure](../docs/editor_mixed_structure.drawio.svg)

The editor is made up of several components:

### Editor Element

The editor element controls all components and exposes methods to interact with the editor.

### Registries

- BlockRegistry holds the Root and Drawer blocks, which are the root blocks of the two block trees, as well as detached blocks during the drag process. See [data structure](#data-structure) below. It also manages metadata about blocks: Size, Position, Markings.
- ConnectorRegistry keeps track of connectors in the editor to facilitate connector lookup for drag snapping.

### Renderers & Layouter

Renderers and Layouters are split into base classes and implementations to allow for quick customization. The render configuration can be defined using the config property.

- The **layouter** first determines the size of each block in reverse breadth-first order. Then, it determines the position of each block in depth-first order. SizeParams split up sizes into heads, bodies, intermediates, and tails to be rendered by the block renderer.
- The **block renderer** renders each block according to its type, content, and the size parameters provided by the layouter. Each block is nested in its parent's element.
- The **input renderer** renders input fields for blocks that require user input. It is used by the block renderer and creates widgets for user input interaction.
- The **drag renderer** calls on the block renderer to render the currently dragged block stack and positions it correctly, adding snapping indicators.
- The **drawer renderer** renders the drawer element and calls on the block renderer to render the blocks in the drawer.
- The **widget renderer** renders widgets on top of the editor. These are used for selectors, list editing, and to overlay accessible inputs.
- The **extras renderer** renders additional elements like zoom buttons and workspace background.

### Compilers

Compilers turn the block tree into code. Currently implemented are Kotlin and JavaScript compilers.

### Helpers

- **DragHelper** listens to drag events, pops blocks and connects them to their new position
- **PanZoomHelper** enables panning and zooming of the workspace
- **WorkspaceStateHelper** tracks blocks that are being added or removed from the workspace to notify side effects

### Side-Effects

Side-effects listen to added or removed blocks and modify the state.

- The **variable side-effect** creates variable use blocks or removes them when a variable init block is added or removed. It also updates variables when their name or type is changed.
- The **function side-effect** does something similar for functions, additionally modifying function invocation blocks' available connectors when parameters are added or removed.

### Code Editor

The code editor uses prism to highlight code and applies different behaviors on input. It is used as input inside blocks and widgets.

## Data Structure

![Data Structure](../docs/mixed_data_structure.drawio.svg)

The block tree is a hybrid structure between an abstract syntax tree and a doubly linked list. It takes the tree's branching structure and represents the syntactic code structure, but it adds reverse connections and is optimized along one axis.

Each block has an upstream parent. It can have multiple downstream children, where the _default_ connection is considered _before/after_.

At any given time, there's a maximum of 3 trees in the editor:

- The workspace tree, starting at the _Root Block_ represents all blocks in the workspace.
- The drawer tree, starting at the _Drawer Block_ represents all blocks in the drawer.
- The drag tree exists only temporarily and represents the currently dragged block stack. It starts at the block the user is dragging.

## Accessibility

The editor is designed to be accessible to everyone, including screen reader and keyboard users. It provides a logical tab order, supports moving blocks and the workspace by keyboard _(j,k,l,w,a,s,d,+,-)_, reads out changes to the workspace, and provides on-screen zoom buttons. A drag operation can be canceled by pressing escape.

Additionally, input fields have to be explicitly enabled to move around the workspace more quickly. Focus will be locked in widgets but can be escaped und Escape.

## Platform Support

The editor is fully compatible with touch devices and automatically closes the drawer on small screens. Safari is supported under regular circumstances, though sometimes rendering might look a bit different.
