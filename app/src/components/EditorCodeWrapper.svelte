<script lang="ts">
  import type { PrismEditor } from "prism-code-editor"
  import { onMount } from "svelte"
  import type { CodeEditorConfiguration } from "../schema/challenge"

  let { data }: { data: CodeEditorConfiguration } = $props()
  let editor = $state<PrismEditor | null>(null)

  onMount(async () => {
    const { createEditor } = await import("prism-code-editor")
    const { indentGuides } = await import("prism-code-editor/guides")
    const { matchTags } = await import("prism-code-editor/match-tags")
    const { matchBrackets } = await import("prism-code-editor/match-brackets")
    const { defaultCommands, editHistory, setIgnoreTab } = await import(
      "prism-code-editor/commands"
    )
    const { highlightBracketPairs } = await import("prism-code-editor/highlight-brackets")

    await import("prism-code-editor/prism/languages/kotlin")

    await import("prism-code-editor/layout.css")
    await import("prism-code-editor/scrollbar.css")
    await import("prism-code-editor/themes/github-dark.css")

    editor = createEditor(
      "#editor-code",
      {
        language: "kotlin",
        value: data.initialValue ?? "",
        tabSize: 4,
        insertSpaces: false,
      },
      indentGuides(),
      matchBrackets(),
      matchTags(),
      defaultCommands(),
      editHistory(),
      highlightBracketPairs()
    )
    setIgnoreTab(false)
  })
</script>

<div id="editor-code" bind:this={editor as any}></div>

<style lang="scss">
  #editor-code :global {
    height: 100%;
    width: 100%;
    border: 1px solid theme("colors.beige.600");
    .prism-code-editor {
      height: 100%;
      width: 100%;
    }
  }
</style>
