<script lang="ts">
  import type { Challenge } from "../schema/challenge"
  import CheckIcon from "../icons/check-circle.svelte"
  import CrossIcon from "../icons/cross-circle.svelte"
  import SpinnerIcon from "../icons/spinner-animated.svelte"

  import { TestResult } from "@kutelabs/client-runner/src"
  import { testState } from "../state/state"
  const { tests: testData }: { tests: Challenge["tests"] } = $props()

  const tests =
    testData?.flatMap(test =>
      Object.entries(test.run).map(([id, { description }]) => ({ id, description }))
    ) ?? []

  const stateToColorClass = (state: TestResult | null) => {
    switch (state) {
      case TestResult.Passed:
        return "text-green-500"
      case TestResult.Failed:
        return "text-red-500"
      default:
        return ""
    }
  }
</script>

{#if tests.length}
  <hr />
{/if}

<div class="flex flex-col gap-4">
  {#each tests as test}
    <div
      class={`flex flex-row gap-2 kt-test test-${$testState[test.id]?.state} items-center ${[stateToColorClass($testState[test.id]?.state)]}`}
      id={`test-${test.id}`}>
      <div class="size-5">
        {#if $testState[test.id]?.state === "passed"}
          <CheckIcon class="test-passed size-5" />
        {:else if $testState[test.id]?.state === "failed"}
          <CrossIcon class="test-failed size-5" />
        {:else if $testState[test.id]?.state === "pending"}
          <SpinnerIcon class="test-pending size-5" />
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            role="img"
            class="test-untested size-5 iconify iconify--humbleicons"
            viewBox="0 0 24 24"
            ><path
              fill="none"
              stroke="currentColor"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0z"></path
            ></svg>
        {/if}
      </div>

      <div class="flex flex-col justify-center">
        <p class="font-medium">{test.description}</p>
        {#if $testState[test.id]?.message}
          <p id="test-message" class="font-normal">{$testState[test.id]?.message}</p>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .kt-test.test-failed {
    animation: horizontal-shaking 150ms 1;
  }

  @keyframes horizontal-shaking {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(5px);
    }
    50% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
    100% {
      transform: translateX(0);
    }
  }
</style>
