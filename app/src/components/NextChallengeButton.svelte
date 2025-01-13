<script lang="ts">
  import { challengeCompleted } from "../state/state"
  import ElevatedBox from "./ElevatedBox.svelte"

  const {
    nextUrl,
  }: {
    nextUrl: string
  } = $props()
</script>

{#if $challengeCompleted && nextUrl}
  <hr />
  <a href={nextUrl} aria-label="Next Challenge" class="flex" data-astro-prefetch>
    <ElevatedBox elevation={2} hoverable={true} className="w-full">
      <div class="flex items-center justify-center w-full h-full p-5 bg-beige-300 select-none">
        <p>Next Challenge</p>
      </div>
    </ElevatedBox>
  </a>
{/if}
