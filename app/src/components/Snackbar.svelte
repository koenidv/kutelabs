<script lang="ts">
  import { consumedMessage, snackbarState, type SnackbarMessage } from "../state/state"

  let displayMessage: SnackbarMessage | undefined = undefined
  let messageConsumer: Timer

  function startMessageConsumption() {
    displayMessage = undefined
    if (messageConsumer) clearInterval(messageConsumer)
    if ($snackbarState.length == 0) return

    const newMessage = $snackbarState[0]
    setTimeout(() => (displayMessage = newMessage), 0)

    if (newMessage.duration >= 0) {
      const id = newMessage?.id
      messageConsumer = setInterval(() => {
        if (newMessage && newMessage.id == id) {
          consumedMessage(id)
        }
      }, newMessage.duration)
    }
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

{#if displayMessage}
  <div
    class={`messagebox absolute bottom-4 left-4 flex flex-row gap-4 p-4 border border-black shadow-lg ${typeToColor(displayMessage.type)}`}>
    <p>{displayMessage.message}</p>
    <button on:click={() => consumedMessage(displayMessage.id)} aria-label="Close message"
      >X</button>
  </div>
{/if}

<style>
  .messagebox {
    animation: slideIn 150ms ease-out;
  }
  @keyframes slideIn {
    from {
      bottom: 0rem;
      opacity: 0;
    }
    to {
      bottom: 1rem;
      opacity: 1;
    }
  }
</style>
