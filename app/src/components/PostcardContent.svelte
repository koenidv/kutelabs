<script lang="ts">
  import { fade } from "svelte/transition"
  import type { Postcard } from "../schema/postcard"

  let { config }: { config: Postcard } = $props()
</script>

<div class="w-full h-full">
  {config.message}
  <!-- todo markdown rendering (needs to be dynamic; can't use astropub/md) -->
  <!-- todo postcard layout -->
</div>
