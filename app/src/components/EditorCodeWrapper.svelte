<script lang="ts">
  import Icon, { loadIcons } from "@iconify/svelte"
  import type { PrismEditor } from "prism-code-editor"
  import { onMount } from "svelte"
  import { fade } from "svelte/transition"
  import type { CodeEditorConfiguration } from "../schema/challenge"
  import { editorLoadingState, editorRef } from "../state/state"

  import { createEditor } from "prism-code-editor"
  import { defaultCommands, editHistory, setIgnoreTab } from "prism-code-editor/commands"
  import { indentGuides } from "prism-code-editor/guides"
  import { highlightBracketPairs } from "prism-code-editor/highlight-brackets"
  import { matchBrackets } from "prism-code-editor/match-brackets"
  import { matchTags } from "prism-code-editor/match-tags"

  import "prism-code-editor/layout.css"
  import "prism-code-editor/prism/languages/kotlin"
  import "prism-code-editor/scrollbar.css"
  import "prism-code-editor/themes/github-dark.css"

  export interface EditorCodeInterface {
    code(): string | null
    entrypoint(): string
    argnames(): string[]
    highlight(line: number, column: number): void
    clearHighlight(): void
    reset(): void
  }

  let { data, challengeId }: { data: CodeEditorConfiguration; challengeId: string } = $props()
  let editor = $state<PrismEditor | null>(null)

  onMount(async () => {
    const previousState = retrieveState()
    editor = createEditor(
      "#editor-code",
      {
        language: "kotlin",
        value: previousState ? previousState : (data.initialValue ?? ""),
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

    editor.addListener("update", () => {
      clearHighlight()
      saveState()
    })
  })

  function highlightLine(line: number): Element | null {
    const element = editor?.wrapper.querySelector(`.pce-line:nth-child(${line + 1})`)
    element?.classList.add("error-line")
    return element ?? null
  }

  function highlightToken(lineElement: Element, column: number) {
    let currentColumn = 0
    let highlighted = false

    lineElement.childNodes.forEach(node => {
      if (highlighted) return

      const textContent = node.textContent ?? ""
      const nodeLength = textContent.length

      if (currentColumn + nodeLength > column) {
        if (node.nodeType === Node.TEXT_NODE) {
          const errorSpan = document.createElement("span")
          errorSpan.className = "error-token"
          errorSpan.textContent = textContent === "\n" ? "  " : textContent

          node.parentNode!.replaceChild(errorSpan, node)
        } else if (node instanceof Element) {
          ;(node as HTMLElement).classList.add("error-token")
        }
        highlighted = true
      } else {
        currentColumn += nodeLength
      }
    })
  }

  function highlightAllTokens(lineElement: Element) {
    let contentStarted = false

    lineElement.childNodes.forEach(node => {
      const textContent = node.textContent ?? ""
      if (!contentStarted && textContent.trim().length === 0) return
      contentStarted = true

      if (node.nodeType === Node.TEXT_NODE) {
        const errorSpan = document.createElement("span")
        errorSpan.className = "error-token"
        errorSpan.textContent = textContent

        node.parentNode!.replaceChild(errorSpan, node)
      } else if (node instanceof Element) {
        ;(node as HTMLElement).classList.add("error-token")
      }
    })

    // remove trailing
    let lastNode = lineElement.lastChild
    while (lastNode && lastNode.textContent?.trim().length === 0) {
      lastNode = lastNode.previousSibling
    }
    if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
      const trimmedContent = lastNode.textContent?.trimEnd() ?? ""
      if (trimmedContent.length !== lastNode.textContent?.length) {
        const errorSpan = document.createElement("span")
        errorSpan.className = "error-token"
        errorSpan.textContent = trimmedContent

        lastNode.parentNode!.replaceChild(errorSpan, lastNode)
      }
    }
  }

  function highlight(line: number, column: number) {
    const lineElement = highlightLine(line)
    if (!lineElement) return
    if (column >= 0) highlightToken(lineElement, column)
    else highlightAllTokens(lineElement)
  }

  function clearHighlight() {
    editor?.wrapper
      .querySelectorAll(".error-line")
      .forEach((line: Element) => line.classList.remove("error-line"))
    editor?.wrapper
      .querySelectorAll(".error-token")
      .forEach((token: Element) => token.classList.remove("error-token"))
  }

  let lastSave = 0
  function saveState() {
    if (lastSave + 2000 > Date.now()) return
    lastSave = Date.now()
    localStorage.setItem(`editor-state-${challengeId}`, editor?.value ?? "")
  }
  function retrieveState() {
    return localStorage.getItem(`editor-state-${challengeId}`)
  }

  function reset() {
    if (!editor) throw new Error("Editor not initialized")
    editor.textarea.value = data.initialValue ?? ""
    clearHighlight()
    editor.update()
    saveState()
  }

  editorRef.set({
    code: () => (editor?.value ? editor.value + "\n" + data.invisibleCode : null),
    entrypoint: () => data.entrypoint ?? "main",
    argnames: () => data.argnames ?? [],
    highlight: highlight,
    clearHighlight: clearHighlight,
    reset: reset,
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
