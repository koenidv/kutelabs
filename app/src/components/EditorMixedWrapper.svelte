<script lang="ts">
  import { EditorMixed } from "@kutelabs/editor-mixed"
  import "lit"
  import type { Challenge } from "../schema/challenge"
  import { onMount } from "svelte"
  import { editorRef } from "../state/state"

  const { data }: { data: Challenge["data"] } = $props()

  let ref: EditorMixed
  onMount(async () => {
    await import("@kutelabs/editor-mixed")
  })

  $effect(() => {
    if (ref) editorRef.set(ref)
  })
</script>

<editor-mixed {data} useDefaultConfig bind:this={ref}></editor-mixed>
