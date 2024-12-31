<script lang="ts">
  import "@kutelabs/editor-mixed"
  import { EditorMixed } from "@kutelabs/editor-mixed"
  import "lit"
  import type { Challenge } from "../schema/challenge"
  import { editorRef } from "../state/state"

  const { data }: { data: Challenge["data"] } = $props()

  let ref: EditorMixed
  $effect(() => {
    if (ref) editorRef.set(ref)
  })
</script>

<editor-mixed {data} useDefaultConfig bind:this={ref}></editor-mixed>
