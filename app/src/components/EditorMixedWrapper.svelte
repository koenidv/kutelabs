<script lang="ts">
  import "@kutelabs/editor-mixed"
  import { EditorMixed } from "@kutelabs/editor-mixed"
  import "lit"
  import type { Challenge } from "../schema/challenge"
  import { editorLoadingState, editorRef } from "../state/state"
  import Icon, { loadIcons } from "@iconify/svelte"
  import { fade } from "svelte/transition"

  const { data }: { data: Challenge["data"] } = $props()

  let ref: EditorMixed
  $effect(() => {
    if (ref) editorRef.set(ref)
  })

  loadIcons(["svg-spinners:ring-resize"])
</script>

<editor-mixed {data} useDefaultConfig bind:this={ref}></editor-mixed>
{#if $editorLoadingState}
  <div
    transition:fade={{ duration: 150 }}
    class="absolute top-0 left-0 w-full h-full flex items-center justify-center border-black border-4 bg-beige-100 bg-opacity-50 backdrop-blur-[2px]">
    <Icon class="test-pending size-10" icon="svg-spinners:ring-resize" />
  </div>
{/if}