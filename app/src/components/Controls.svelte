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
  const executionRunning = execution.running

  onMount(() => {
    // set default on client only to prevent ssr flash
    if ($speed == undefined) speed.set("medium")
  })
</script>

<div class="flex flex-col gap-4 py-4 justify-between">
  <div class="flex flex-row lg:flex-col gap-4 items-center">
    {#if !$executionRunning}
      <button
        onclick={execution.run.bind(execution)}
        aria-label="Run your code" 
        class="bg-purp-400 rounded-full w-20 h-20 hover:bg-lime-400 transition-colors flex justify-center items-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="50%" viewBox="0 0 24 24"
          ><path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 17.259V6.741a1 1 0 0 1 1.504-.864l9.015 5.26a1 1 0 0 1 0 1.727l-9.015 5.259A1 1 0 0 1 7 17.259" /></svg
        ></button>
    {:else}
      <button
        onclick={execution.stop.bind(execution)}
        class="bg-rose-400 rounded-full w-20 h-20 hover:bg-red-500 transition-colors">Stop</button>
    {/if}
    <button
      onclick={() => execution.setSpeed("fast")}
      class={`grou w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$speed == "fast" ? "border-black" : "border-transparent"}`}>
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
      onclick={execution.printJs.bind(execution)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print JS</button>
    <button
      onclick={execution.printKt.bind(execution)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print Kt</button>
    <button
      onclick={execution.runJs.bind(execution)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Js</button>
    <button
      onclick={execution.runKt.bind(execution)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Kt</button>
  </div>
</div>
