<script lang="ts">
  import type { LogType } from "@kutelabs/client-runner"
  import { logState } from "../state/state"

  const colorByType = (type: LogType, logs: any[]) => {
    if (logs.join("").length === 0) return "text-gray-500 italic"
    switch (type) {
      case "error":
        return "text-red-500"
      case "warn":
        return "text-yellow-500"
      case "log":
        return "text-blue-500"
    }
  }

  const getLogText = (log: any[]) => {
    const joined = log.map((it: any) => it?.toString()).join(", ")
    return joined != "" ? joined : "nothing printed"
  }
</script>

<div class="max-lg:max-h-96 overflow-y-auto">
  <h2>If your code prints anything or throws an error, it will show up here.</h2>
  <div class="flex flex-col pt-4 kt-logs">
    {#each $logState as log}
      <p
        role="log"
        class={`font-normal p-2, border-beige-200 border-t-2 last:border-b-2 ${colorByType(log.type, log.log)}`}>
        {getLogText(log.log)}
      </p>
    {/each}
  </div>
</div>
