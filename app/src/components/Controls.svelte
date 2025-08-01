<script lang="ts">
  import type JSConfetti from "js-confetti"
  import { onMount } from "svelte"
  import { MixedExecutionWrapper } from "../execution/MixedExecutionWrapper"
  import { CodeExecutionWrapper } from "../execution/CodeExecutionWrapper"
  import CaretUp from "../icons/caret-up.svelte"
  import PlayIcon from "../icons/play.svelte"
  import DeleteIcon from "../icons/delete.svelte"
  import FastIcon from "../icons/speed-fast.svelte"
  import MediumIcon from "../icons/speed-medium.svelte"
  import SlowIcon from "../icons/speed-slow.svelte"
  import StopIcon from "../icons/stop.svelte"
  import type { Challenge } from "../schema/challenge"
  import { challengeCompleted, confettiRef } from "../state/state"
  import ElevatedBox from "./ElevatedBox.svelte"
  import { storeChallengeCompleted, getChallengeCompleted } from "../state/completedChallenges"

  const {
    id: challengeId,
    tests,
    environment,
    editorType,
    confetti: confettiEnabled,
  }: {
    id: string
    tests: Challenge["tests"]
    environment: Challenge["environment"]
    editorType: Challenge["editor"]["type"]
    confetti: Boolean
  } = $props()

  const execution =
    editorType == "mixed"
      ? new MixedExecutionWrapper(tests, environment)
      : new CodeExecutionWrapper(tests, environment)

  const executionRunning = execution.running
  const speed = execution instanceof MixedExecutionWrapper ? execution.speed : undefined

  let debugMenuOpen = $state(false)
  let confetti: JSConfetti | null = null

  onMount(() => {
    ;(async () => {
      // set default on client only to prevent ssr flash
      if (speed && $speed == undefined) speed.set("medium")
      if (confettiEnabled) {
        confetti = new (await import("js-confetti")).default()
        confettiRef.set(confetti)
      }
      checkLocalChallengeCompletion()
      if (tests.flatMap(t => Object.keys(t.run)).length == 0) challengeCompleted.set(true)

      execution.onSuccess = () => {
        if (confetti && !challengeCompleted.get())
          confetti.addConfetti({
            emojis: ["⚡️", "✨", "💫", "🌸", "🚀", "☘️", "⭐", "✅"],
          })
        storeChallengeCompleted(challengeId)
        challengeCompleted.set(true)
      }
    })()
    return () => {
      confettiRef.set(null)
      confetti = null
      execution.stop()
    }
  })

  async function checkLocalChallengeCompletion() {
    if (await getChallengeCompleted(challengeId)) {
      challengeCompleted.set(true)
      execution.passAllTests()
    }
  }
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

    {#if execution instanceof MixedExecutionWrapper}
      <div
        class="flex flex-row lg:flex-col gap-3 lg:gap-2 relative before:content-[''] before:bg-beige-500 before:bg-opacity-50 before:border-beige-500 before:border-4 before:absolute before:top-1 before:-bottom-1 before:left-1 before:-right-1">
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
        <div class="hidden lg:flex pt-2 justify-center">
          <p class="font-gummy text-xl text-sideways">Speed →</p>
        </div>
      {/if}
    {:else if execution instanceof CodeExecutionWrapper}
      <div class="h-16 w-16 pt-1 pl-1 transition-[padding] duration-100 ease-out">
        <ElevatedBox
          elevation={1}
          hoverable={$executionRunning == false}
          label="Reset code editor content"
          className="w-14 h-14"
          onClick={() => !$executionRunning && execution.resetEditor}>
          <div
            class="flex items-center justify-center w-full h-full bg-beige-300 ${!$executionRunning
              ? 'hover:bg-rose-300'
              : ''} transition-colors">
            <DeleteIcon />
          </div>
        </ElevatedBox>
      </div>
    {/if}
  </div>

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
      {#if "printJs" in execution}
        <ElevatedBox
          elevation={1}
          hoverable={true}
          label="Print JS"
          className="w-14 h-14 bg-beige-300"
          onClick={execution.printJs.bind(execution)}>
          <p>Print JS</p>
        </ElevatedBox>
      {/if}
      {#if "printKt" in execution}
        <ElevatedBox
          elevation={1}
          hoverable={true}
          label="Print Kt"
          className="w-14 h-14 bg-beige-300"
          onClick={execution.printKt.bind(execution)}>
          <p>Print Kt</p>
        </ElevatedBox>
      {/if}
      {#if "runJs" in execution}
        <ElevatedBox
          elevation={1}
          hoverable={true}
          label="Run JS"
          className="w-14 h-14 bg-beige-300"
          onClick={execution.runJs.bind(execution)}>
          <p>Run JS</p>
        </ElevatedBox>
      {/if}
      {#if "runKt" in execution}
        <ElevatedBox
          elevation={1}
          hoverable={true}
          label="Run Kt"
          className="w-14 h-14 bg-beige-300"
          onClick={execution.runKt.bind(execution)}>
          <p>Run <br />Kt</p>
        </ElevatedBox>
      {/if}
    </div>
  {/if}
</div>
