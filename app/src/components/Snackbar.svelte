<script lang="ts">
  import { consumedMessage, snackbarState } from "../state/state"

  let messageConsumer: Timer

  function startMessageConsumption() {
    if (messageConsumer) clearInterval(messageConsumer)
    if ($snackbarState.length == 0 || $snackbarState[0].duration < 0) return

    const id = $snackbarState[0]?.id
    messageConsumer = setInterval(() => {
      if ($snackbarState[0] && $snackbarState[0].id == id) {
        consumedMessage(id)
      }
    }, $snackbarState[0].duration)
  }

  $: $snackbarState, startMessageConsumption()

  function typeToColor(type: string) {
    switch (type) {
      case "error":
        return "bg-red-400"
      case "success":
        return "bg-green-400"
      case "info":
        return "bg-beige-100"
      default:
        return "bg-white"
    }
  }
</script>

{#if $snackbarState[0]}
  <div
    class={`absolute bottom-4 left-4 flex flex-row gap-4 p-4 border border-black shadow-lg ${typeToColor($snackbarState[0].type)}`}>
    <p>{$snackbarState[0].message}</p>
    <button on:click={() => consumedMessage($snackbarState[0].id)} aria-label="Close message"
      >X</button>
  </div>
{/if}
