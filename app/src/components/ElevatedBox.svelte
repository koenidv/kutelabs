<script lang="ts">
  interface Props {
    elevation?: number
    hoverable?: boolean
    label?: string
    onClick?: () => void
    class?: string
    style?: string
  }

  export let elevation: number = 4
  export let hoverable: boolean = false
  export let label: string | undefined = undefined
  export let onClick: () => void = () => {}
  export let className: string = ""
  export let style: string | undefined = undefined
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="group elevated-card elevated-{elevation} {hoverable
    ? 'hoverable hover:cursor-pointer'
    : ''} {className}"
  {style}
  tabindex={hoverable ? 0 : -1}
  aria-label={label}
  on:click={() => onClick && onClick()}
  on:keydown={(e) => e.key === "Enter" && onClick()}
  role={hoverable ? "button" : undefined}>
  <div class="h-full w-full border-l-4 border-t-4 border-r-2 border-b-2 border-black">
    <slot />
  </div>
</div>
