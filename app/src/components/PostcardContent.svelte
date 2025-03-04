<script lang="ts">
  import type { Postcard } from "../schema/postcard"
  import { onMount } from "svelte"
  import SvelteMarkdown from "svelte-markdown"

  let { config }: { config: Postcard } = $props()

  let username = $state("you")

  onMount(() => {
    username = localStorage.getItem("username") || "you"
  })

  function replaceUsername(text: string) {
    return text.replaceAll("{{username}}", username)
  }
</script>

<div class="w-full h-full">
  <div class="flex flex-col w-full h-full lg:flex-row-reverse">
    <div
      class="w-full basis-1/4 p-4 flex flex-row-reverse lg:flex-col max-lg:justify-between lg:items-end">
      <div class="stamp lg:pb-4">
        <img
        src={config.stamp.src}
        alt={config.stamp.alt}
        class="object-contain h-full w-full bg-[#FFD203] rounded-sm stampshadow" />
      </div>
      <div class="flex-col items-end font-normal font-gummy text-start lg:text-end p-2 md">
        <SvelteMarkdown source={"from " + config.from} />
        <SvelteMarkdown source={"to " + replaceUsername(config.to ?? "{{username}}")} />
      </div>
    </div>

    <div class="w-full basis-3/4 p-4 lg:p-8 text-start font-normal font-gummy md lg:overflow-y-auto">
      <SvelteMarkdown source={replaceUsername(config.message)} />
    </div>
    <!-- todo markdown rendering (needs to be dynamic; can't use astropub/md) -->
    <!-- todo postcard layout -->
  </div>
</div>

<style lang="scss">
  .stamp {
    width: 10rem;
    height: 8rem;
    display: inline-block;
    padding: 0.5rem;
    background: white;
    position: relative;
    -webkit-filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.4));
    filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.4));
    /*The stamp cutout will be created using crisp radial gradients*/
    background: radial-gradient(transparent 0px, transparent 0.25rem, white 0.25rem, white);

    /*reducing the gradient size*/
    background-size: 1rem 1rem;
    /*Offset to move the holes to the edge*/
    background-position: -0.5rem -0.5rem;
  }

  :global(.md a) {
    color: blue;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 0.3em;
    }
  }

  .stampshadow {
    box-shadow: inset 0 0 0.5rem 0 white;
  }
</style>
