<script lang="ts">
  import Icon, { loadIcons } from "@iconify/svelte"
  import "@kutelabs/editor-mixed"
  import { EditorMixed } from "@kutelabs/editor-mixed"
  import type { MixedEditorConfig } from "@kutelabs/editor-mixed/src/util/MixedEditorConfig"
  import "lit"
  import { fade } from "svelte/transition"
  import { editorLoadingState, editorRef } from "../state/state"

  const { data }: { data: MixedEditorConfig } = $props()

  let ref: EditorMixed
  $effect(() => {
    if (ref) editorRef.set(ref)
  })

  loadIcons(["svg-spinners:ring-resize"])
</script>

<editor-mixed {data} useDefaultConfig bind:this={ref}  transition:fade={{ duration: 60 }}></editor-mixed>
{#if $editorLoadingState}
  <div
    transition:fade={{ duration: 150 }}
    class="absolute top-0 left-0 w-full h-full flex items-center justify-center border-black border-4 bg-beige-100 bg-opacity-50 backdrop-blur-[2px]">
    <Icon class="test-pending size-10" icon="svg-spinners:ring-resize" />
  </div>
{/if}