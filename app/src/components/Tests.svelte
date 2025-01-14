<script lang="ts">
  import Icon, { loadIcons } from "@iconify/svelte"
  import type { Challenge } from "../schema/challenge"
  import { testState } from "../state/state"
  import { TestResult } from "@kutelabs/client-runner/src"
  const { tests: testData }: { tests: Challenge["tests"] } = $props()

  const tests = testData?.flatMap(test =>
    Object.entries(test.run).map(([id, { description }]) => ({ id, description }))
  ) ?? []

  loadIcons(["humbleicons:check-circle", "humbleicons:times-circle", "svg-spinners:ring-resize"])

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
      class={`flex flex-row gap-2 kt-test items-center ${[stateToColorClass($testState[test.id]?.state)]}`}
      id={`test-${test.id}`}>
      <div class="size-5">
        {#if $testState[test.id]?.state === "passed"}
          <Icon class="test-passed size-5" icon="humbleicons:check-circle" />
        {:else if $testState[test.id]?.state === "failed"}
          <Icon class="test-failed size-5" icon="humbleicons:times-circle" />
        {:else if $testState[test.id]?.state === "pending"}
          <Icon class="test-pending size-5" icon="svg-spinners:ring-resize" />
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
