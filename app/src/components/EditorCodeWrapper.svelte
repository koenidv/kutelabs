<script lang="ts">
  import type { PrismEditor } from "prism-code-editor"
  import { onMount } from "svelte"
  import type { CodeEditorConfiguration } from "../schema/challenge"
  import { editorLoadingState, editorRef } from "../state/state"
  import { fade } from "svelte/transition"
  import Icon, { loadIcons } from "@iconify/svelte"

  import { createEditor } from "prism-code-editor"
  import { indentGuides } from "prism-code-editor/guides"
  import { matchTags } from "prism-code-editor/match-tags"
  import { matchBrackets } from "prism-code-editor/match-brackets"
  import { defaultCommands, editHistory, setIgnoreTab } from "prism-code-editor/commands"
  import { highlightBracketPairs } from "prism-code-editor/highlight-brackets"

  import "prism-code-editor/prism/languages/kotlin"
  import "prism-code-editor/layout.css"
  import "prism-code-editor/scrollbar.css"
  import "prism-code-editor/themes/github-dark.css"

  export interface EditorCodeInterface {
    code(): string
    entrypoint(): string
    argnames(): string[]
    highlight(line: number, column: number): void
  }

  let { data }: { data: CodeEditorConfiguration } = $props()
  let editor = $state<PrismEditor | null>(null)

  onMount(async () => {
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

  function highlightLine(line: number): Element | null {
    const element = editor?.wrapper.querySelector(`.pce-line:nth-child(${line + 1})`)
    element?.classList.add("error-line")
    return element ?? null
  }

  function highlightToken(lineElement: Element, column: number) {
    let currentColumn = 0
    let highlighted = false
    lineElement.querySelectorAll(".token").forEach(token => {
      if (highlighted) return
      const tokenLength = token.textContent?.length ?? 0
      if (currentColumn + tokenLength >= column) {
        token.classList.add("error-token")
        return (highlighted = true)
      }
      currentColumn += tokenLength
    })
  }

  function highlight(line: number, column: number) {
    const lineElement = highlightLine(line)
    if (lineElement) highlightToken(lineElement, column)
  }

  editorRef.set({
    code: () => editor?.value ?? "",
    entrypoint: () => data.entrypoint ?? "main",
    argnames: () => data.argnames ?? [],
    highlight: highlight,
  })

  loadIcons(["svg-spinners:ring-resize"])
</script>

<div id="editor-code" bind:this={editor as any} transition:fade={{ duration: 60 }}></div>
{#if $editorLoadingState}
  <div
    transition:fade={{ duration: 150 }}
    class="absolute top-0 left-0 w-full h-full flex items-center justify-center border-beige-600 border-4 bg-beige-800 text-white bg-opacity-50 backdrop-blur-[2px]">
    <Icon class="test-pending size-10" icon="svg-spinners:ring-resize" />
  </div>
{/if}

<style lang="scss">
  #editor-code :global {
    height: 100%;
    width: 100%;
    border: 1px solid theme("colors.beige.600");
    .prism-code-editor {
      height: 100%;
      width: 100%;
    }
    .error-line:after {
      border: var(--widget__error-ring);
      background: var(--widget__bg-error);
      z-index: -2;
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
    .error-token {
      position: relative;

      // global selectors cannot refer to multiple selectors
      &::before {
        background: radial-gradient(
          6px,
          transparent,
          transparent 1px,
          red 1px,
          red 3px,
          transparent 4px
        );
        background-size: 10px 14px;

        content: "";
        display: block;
        position: absolute;
        height: 6px;
        bottom: 0px;
        left: 2px;
        right: 0;
        z-index: -1;
      }
      &::after {
        background: radial-gradient(
          6px,
          transparent,
          transparent 1px,
          red 1px,
          red 3px,
          transparent 4px
        );
        background-size: 10px 14px;
        background-position: 0px -7px;

        content: "";
        display: block;
        position: absolute;
        height: 6px;
        bottom: -6px;
        left: -3px;
        right: 0;
        z-index: -1;
      }
    }
  }
</style>
