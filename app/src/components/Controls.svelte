<script lang="ts">
  import { onMount } from "svelte"
  import { ExecutionWrapper } from "../execution/MixedExecutionWrapper"
  import FastIcon from "../icons/speed-fast.svelte"
  import MediumIcon from "../icons/speed-medium.svelte"
  import SlowIcon from "../icons/speed-slow.svelte"
  import type { Challenge } from "../schema/challenge"

  const {
    tests,
    environment,
  }: { tests: Challenge["tests"]; environment: Challenge["environment"] } = $props()

  const execution = new ExecutionWrapper(tests, environment)
  const speed = execution.speed

  onMount(() => {
    // set default on client only to prevent ssr flash
    if ($speed == undefined) speed.set("medium")
  })
</script>

<div class="flex flex-col gap-4 py-4 justify-between">
  <div class="flex flex-row lg:flex-col gap-4 items-center">
    <button
      onclick={execution.run}
      class="bg-purp-400 rounded-full w-20 h-20 hover:bg-lime-400 transition-colors">Run</button>
    <button
      onclick={() => execution.setSpeed("fast")}
      class={`grouspeedunded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$speed == "fast" ? "border-black" : "border-transparent"}`}>
      <FastIcon />
    </button>
    <button
      onclick={() => execution.setSpeed("medium")}
      class={`group w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$speed == "medium" ? "border-black" : "border-transparent"}`}>
      <MediumIcon />
    </button>
    <button
      onclick={() => execution.setSpeed("slow")}
      class={`group w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$speed == "slow" ? "border-black" : "border-transparent"}`}>
      <SlowIcon />
    </button>
  </div>
  <div class="flex flex-row lg:flex-col gap-4">
    <button
      onclick={execution.printJs}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print JS</button>
    <button
      onclick={execution.printKt}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print Kt</button>
    <button
      onclick={execution.runJs}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Js</button>
    <button
      onclick={execution.runKt}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Kt</button>
  </div>
</div>
