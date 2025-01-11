<script lang="ts">
  import type JSConfetti from "js-confetti"
  import { onMount } from "svelte"
  import { MixedExecutionWrapper } from "../execution/MixedExecutionWrapper"
  import CaretUp from "../icons/caret-up.svelte"
  import PlayIcon from "../icons/play.svelte"
  import FastIcon from "../icons/speed-fast.svelte"
  import MediumIcon from "../icons/speed-medium.svelte"
  import SlowIcon from "../icons/speed-slow.svelte"
  import StopIcon from "../icons/stop.svelte"
  import type { Challenge } from "../schema/challenge"
  import { challengeCompleted } from "../state/state"
  import ElevatedBox from "./ElevatedBox.svelte"

  const {
    tests,
    environment,
    confetti: confettiEnabled,
  }: {
    tests: Challenge["tests"]
    environment: Challenge["environment"]
    confetti: Boolean
  } = $props()

  const execution = new MixedExecutionWrapper(tests, environment)
  const speed = execution.speed
  const executionRunning = execution.running

  let debugMenuOpen = $state(false)
  let confetti: JSConfetti | null = null

  onMount(async () => {
    // set default on client only to prevent ssr flash
    if ($speed == undefined) speed.set("medium")
    if (confettiEnabled) confetti = new (await import("js-confetti")).default()

    execution.onSuccess = () => {
      if (confetti && !challengeCompleted.get())
        confetti.addConfetti({
          emojis: ["⚡️", "✨", "💫", "🌸", "🚀", "☘️", "⭐", "✅"],
        })
      challengeCompleted.set(true)
    }
  })
</script>

<div class="flex flex-col gap-4 py-4 justify-between select-none">
  <div class="flex flex-row lg:flex-col gap-4 justify-center items-center">
    <div
      class="w-[5rem] h-[5rem] {$executionRunning
        ? 'pt-1 pl-1'
        : ''} transition-[padding] duration-100 ease-out">
      <ElevatedBox
        elevation={$executionRunning ? 1 : 2}
        hoverable={true}
        label="Run your code"
        className="w-[4.5rem] h-[4.5rem]"
        onClick={$executionRunning
          ? execution.stop.bind(execution)
          : execution.run.bind(execution)}>
        <div
          class="flex items-center justify-center w-full h-full {$executionRunning
            ? 'bg-rose-300'
            : 'bg-beige-300'} transition-colors">
          {#if $executionRunning}
            <StopIcon></StopIcon>
          {:else}
            <PlayIcon></PlayIcon>
          {/if}
        </div>
      </ElevatedBox>
    </div>

    <div
      class="h-16 w-16 {$speed == 'fast'
        ? 'pt-1 pl-1'
        : ''} transition-[padding] duration-100 ease-out">
      <ElevatedBox
        elevation={$speed == "fast" ? 1 : 2}
        hoverable={true}
        label="Run your code"
        className="w-14 h-14"
        onClick={() => execution.setSpeed("fast")}>
        <div
          class="flex items-center justify-center w-full h-full {$speed == 'fast'
            ? 'bg-beige-100'
            : 'bg-beige-300'} transition-colors">
          <FastIcon />
        </div>
      </ElevatedBox>
    </div>
    <div
      class="h-16 w-16 {$speed == 'medium'
        ? 'pt-1 pl-1'
        : ''} transition-[padding] duration-100 ease-out">
      <ElevatedBox
        elevation={$speed == "medium" ? 1 : 2}
        hoverable={true}
        label="Run your code"
        className="w-14 h-14"
        onClick={() => execution.setSpeed("medium")}>
        <div
          class="flex items-center justify-center w-full h-full {$speed == 'medium'
            ? 'bg-beige-100'
            : 'bg-beige-300'} transition-colors">
          <MediumIcon />
        </div>
      </ElevatedBox>
    </div>
    <div
      class="h-16 w-16 {$speed == 'slow'
        ? 'pt-1 pl-1'
        : ''} transition-[padding] duration-100 ease-out">
      <ElevatedBox
        elevation={$speed == "slow" ? 1 : 2}
        hoverable={true}
        label="Run your code"
        className="w-14 h-14"
        onClick={() => execution.setSpeed("slow")}>
        <div
          class="flex items-center justify-center w-full h-full {$speed == 'slow'
            ? 'bg-beige-100'
            : 'bg-beige-300'} transition-colors">
          <SlowIcon />
        </div>
      </ElevatedBox>
    </div>
  </div>

  {#if !debugMenuOpen}
    <div class="hidden lg:flex h-44 justify-center">
      <p class="font-gamja text-2xl text-sideways">Speed →</p>
    </div>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="hidden lg:flex h-full flex-row justify-center items-end">
    <div
      class="hover:bg-beige-200 w-full rounded-lg flex justify-center {debugMenuOpen
        ? 'transform rotate-180'
        : ''}"
      role="button"
      aria-label="Toggle dev menu"
      tabindex="0"
      onclick={() => (debugMenuOpen = !debugMenuOpen)}>
      <CaretUp></CaretUp>
    </div>
  </div>

  {#if debugMenuOpen}
    <div class="flex flex-row lg:flex-col gap-4 items-center">
      <ElevatedBox
        elevation={1}
        hoverable={true}
        label="Print JS"
        className="w-14 h-14 bg-beige-300"
        onClick={execution.printJs.bind(execution)}>
        <p>Print JS</p>
      </ElevatedBox>
      <ElevatedBox
        elevation={1}
        hoverable={true}
        label="Print Kt"
        className="w-14 h-14 bg-beige-300"
        onClick={execution.printKt.bind(execution)}>
        <p>Print Kt</p>
      </ElevatedBox>
      <ElevatedBox
        elevation={1}
        hoverable={true}
        label="Run JS"
        className="w-14 h-14 bg-beige-300"
        onClick={execution.runJs.bind(execution)}>
        <p>Run JS</p>
      </ElevatedBox>
      <ElevatedBox
        elevation={1}
        hoverable={true}
        label="Run Kt"
        className="w-14 h-14 bg-beige-300"
        onClick={execution.runKt.bind(execution)}>
        <p>Run <br />Kt</p>
      </ElevatedBox>
    </div>
  {/if}
</div>
