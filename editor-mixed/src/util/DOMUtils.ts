import type { Ref } from "lit/directives/ref.js"

/**
 * Finds the currently active element in the document, including elements inside shadow roots.
 * @param document document to search in
 * @returns active element or null if no active element is found
 */
export function findShadowedActiveElement(document: Document): Element | null {
  let element: Element | null = document.activeElement
  while (element?.shadowRoot && element.shadowRoot.activeElement) {
    element = element.shadowRoot.activeElement
  }
  return element
}

/**
 * Announces the given message to screen readers
 * @param workspaceRef reference to the workspace element
 * @param message message to announce
 * @param polite if true, the message will be announced after the current task
 */
export function srAnnounce(
  workspaceRef: Ref<SVGSVGElement>,
  message: string,
  polite = false
): void {
  const root = workspaceRef.value?.getRootNode() as SVGElement | null
  if (!root) return
  const liveRegion = root.querySelector("#sr-announcement")
  if (!liveRegion) return
  liveRegion.textContent = ""
  liveRegion.textContent = message
  liveRegion.setAttribute("aria-live", polite ? "polite" : "assertive")
}

export function focusBlockElement(workspaceRef: Ref<SVGSVGElement>, id: string): void {
  const root = workspaceRef.value?.getRootNode() as SVGElement | null
  if (!root) return
  const element = root.querySelector(`#block-${id}>.block-container`) as SVGElement | null
  if (element) element.focus()
}
