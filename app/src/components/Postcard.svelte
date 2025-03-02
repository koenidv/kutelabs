<script lang="ts">
  import { fade } from "svelte/transition"
  import type { Postcard } from "../schema/postcard"

  let { config, title }: { config: Postcard; title: String } = $props()
  let flipped = $state(false)
</script>

<div class="flex w-full min-h-full items-center flex-col gap-4 overflow-x-hidden select-none">
  <div
    class={`postcard-container ${flipped ? "flipped top-[20%] lg:aspect-[3/2] max-lg:h-48" : "top-[25%] aspect-[3/2]"} lg:h-[60%] max-lg:w-[70%]  absolute z-10 transition-[top] duration-500`}
    onclick={() => {
      flipped = !flipped
    }}
    onkeydown={e => {
      if (e.key == "Enter") flipped = !flipped
    }}
    role="button"
    aria-details="A postcard; click to flip to text side"
    tabindex="0">
    <div class="postcard w-full min-h-full h-fit shadow-2xl transition-transform duration-500">
      <div class="postcard-front bg-beige-50">
        <img
          src="https://unsplash.it/1000/600"
          alt="Postcard front side"
          class="w-full h-full object-cover" />
      </div>
      <div class="postcard-back bg-beige-50">
        {config.message}
        <!-- todo markdown rendering (needs to be dynamic; can't use astropub/md) -->
        <!-- todo postcard layout -->
      </div>
    </div>
  </div>
  {#if !flipped}
    <div class="h-[15%] flex items-center">
      <h1 transition:fade={{ duration: 300 }} class="font-poppins text-4xl font-black">{title}</h1>
    </div>
    <p
      transition:fade={{ duration: 300 }}
      class="absolute top-[85%] pt-3 font-normal text-sm font-mono">
      click to flip
    </p>
  {:else}
    <div transition:fade={{ duration: 300 }} class="h-full w-full absolute bg-card-overlay"></div>
  {/if}
</div>

<style lang="scss">
  .postcard-container {
    perspective: 1000px;
  }

  /* This container is needed to position the front and back side */
  .postcard {
    position: relative;
    text-align: center;
    transform-style: preserve-3d;
  }

  /* Do an horizontal flip when you move the mouse over the flip box container */
  .flipped .postcard {
    transform: rotateY(180deg) scale(1.25);
  }

  /* Position the front and back side */
  .postcard-front,
  .postcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    -webkit-backface-visibility: hidden; /* Safari */
    backface-visibility: hidden;
  }

  .postcard-back {
    background-image: url("../../public/images/texture-paper.jpg");
    background-color: rgba(252, 251, 247, 0.7);
    background-size: 30rem;
    background-blend-mode: lighten;
    transform: rotateY(180deg);
  }

  .bg-card-overlay {
    background: linear-gradient(transparent, rgba(54, 49, 39, 0.4) 70%);
  }
</style>
