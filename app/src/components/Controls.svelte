<script lang="ts">
  import { SandboxTestRunner, type TestSuite } from "@kutelabs/client-runner"
  import { JsCompiler } from "@kutelabs/editor-mixed/src/compile/JsCompiler"
  import { KtCompiler } from "@kutelabs/editor-mixed/src/compile/KtCompiler"
  import { BlockMarking } from "@kutelabs/editor-mixed/src/render/BlockRenderers/BaseBlockRenderer"
  import { TranspilationStatus } from "@kutelabs/server/src/transpile/TranspilationStatus"
import { persistentAtom } from '@nanostores/persistent'
  import { filterCallbacks } from "../execution/EnvironmentContext"
  import { transpileKtJs } from "../execution/transpile"
  import FastIcon from "../icons/speed-fast.svelte"
  import MediumIcon from "../icons/speed-medium.svelte"
  import SlowIcon from "../icons/speed-slow.svelte"
  import type { Challenge } from "../schema/challenge"
  import { addLog, editorRef, setTestResult } from "../state/state"
  import { onMount } from "svelte"

  const {
    tests: testData,
    environment,
  }: { tests: Challenge["tests"]; environment: Challenge["environment"] } = $props()

  // parse tests
  const tests = (testData ?? []).map(set => {
    return {
      ...set,
      run: Object.fromEntries(
        Object.entries(set.run).map(([id, test]) => {
          return [
            id,
            {
              ...test,
              function: eval(test.function),
            },
          ]
        })
      ),
    }
  }) as unknown as TestSuite

  const testRunner = new SandboxTestRunner(
    tests,
    setTestResult,
    addLog,
    (type, message) => {
      addLog([message], "error")
      console.error("General error from test runner", type, message)
    },
    (id, message) => {
      addLog([message], "error")
      console.error("Error from test runner for block", id, message)
      if (!$editorRef) throw new Error("Editor not found")
      $editorRef.getExecutionCallbacks()["markBlock"]!(id, BlockMarking.Error)
    }
  )

  // todo
  const usernameCallback = (username: string) => {
    console.log("Username will be set to '", username, "' once implemented")
  }

  const executionSpeed = persistentAtom<"fast" | "medium" | "slow">("execSpeed")
  const setSpeed = (speed: "fast" | "medium" | "slow") => {
    executionSpeed.set(speed)
    testRunner.setExecutionDelay(executionDelay[speed])
  }
  const executionDelay = {
    fast: 250,
    medium: 1000,
    slow: 2200,
  }
  onMount(() => {
    // set default on client only to prevent ssr flash
    if ($executionSpeed == undefined) executionSpeed.set("medium")
  })

  function getCallbacks() {
    if (!$editorRef) throw new Error("Editor not found")
    return filterCallbacks(environment.appFeatures ?? [], {
      setUsername: usernameCallback,
      ...$editorRef.getExecutionCallbacks(),
    })
  }

  /**
   * Run code depending on the environment language
   */
  function run() {
    switch (environment.language) {
      case "js":
        runJs()
        break
      case "kt":
        runKt()
        break
      default:
        throw new Error(`Unsupported language ${environment.language}`)
    }
  }

  /**
   * Compile and run the code as JS
   */
  function runJs() {
    if (!$editorRef) throw new Error("Editor not found")
    $editorRef.clearMarkings()

    const callbacks = getCallbacks()
    const compiled = $editorRef.compile(JsCompiler, callbacks)
    testRunner
      .execute(compiled.code, {
        argNames: compiled.argNames,
        entrypoint: compiled.entrypoint,
        callbacks: callbacks,
        executionDelay: executionDelay[$executionSpeed],
        timeout: 5000,
      })
      ?.then(_result => {
        $editorRef.onExecutionFinished()
      })
  }

  /**
   * Compile the code as Kt, transpile and run
   */
  async function runKt() {
    if (!$editorRef) throw new Error("Editor not found")
    $editorRef.clearMarkings()

    const callbacks = getCallbacks()
    const compiled = $editorRef.compile(KtCompiler, callbacks)

    const transpiled = await transpileKtJs(compiled.code)
    if (
      transpiled === null ||
      transpiled.status != TranspilationStatus.Success ||
      !transpiled.transpiledCode
    )
      throw new Error("Transpilation failed")

    testRunner
      .execute(compiled.code, {
        argNames: compiled.argNames,
        entrypoint: compiled.entrypoint,
        callbacks: callbacks,
        executionDelay: executionDelay[$executionSpeed],
        timeout: 5000,
      })
      ?.then(_result => {
        $editorRef.onExecutionFinished()
      })
  }
</script>

<div class="flex flex-col gap-4 py-4 justify-between">
  <div class="flex flex-row lg:flex-col gap-4 items-center">
    <button
      onclick={run}
      class="bg-purp-400 rounded-full w-20 h-20 hover:bg-lime-400 transition-colors">Run</button>
    <button
      onclick={() => setSpeed("fast")}
      class={`group w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$executionSpeed == "fast" ? "border-black" : "border-transparent"}`}>
      <FastIcon />
    </button>
    <button
      onclick={() => setSpeed("medium")}
      class={`group w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$executionSpeed == "medium" ? "border-black" : "border-transparent"}`}>
      <MediumIcon />
    </button>
    <button
      onclick={() => setSpeed("slow")}
      class={`group w-16 h-16 rounded-full hover:bg-beige-300 flex items-center justify-center transition-colors border-2 ${$executionSpeed == "slow" ? "border-black" : "border-transparent"}`}>
      <SlowIcon />
    </button>
  </div>
  <div class="flex flex-row lg:flex-col gap-4">
    <button
      onclick={() => console.log($editorRef?.compile(JsCompiler, getCallbacks())?.code)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print JS</button>
    <button
      onclick={() => console.log($editorRef?.compile(KtCompiler, getCallbacks())?.code)}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >print Kt</button>
    <button
      onclick={runJs}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Js</button>
    <button
      onclick={runKt}
      class="bg-purple-200 rounded-full w-20 h-20 hover:bg-green-300 transition-colors"
      >run Kt</button>
  </div>
</div>
