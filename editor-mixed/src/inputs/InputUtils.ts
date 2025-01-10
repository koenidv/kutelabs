/**
 * Approximates the text selection index in a textarea
 * This is needed because, for security reasons, inputs ignore non-trusted events
 * @param textarea - The textarea HTML element
 * @param x - The X coordinate relative to the viewport
 * @param y - The Y coordinate relative to the viewport
 * @returns The approximate index position in the text
 */
export function approximateCaretPosition(
  textarea: HTMLInputElement | HTMLTextAreaElement,
  x: number,
  y: number
): number {
  const style = window.getComputedStyle(textarea)
  const rect = textarea.getBoundingClientRect()

  let line = {
    charIndex: 0,
    currentLine: textarea.value,
  }
  if (textarea.value.includes("\n")) {
    line = calculateLineIndexOffset(
      textarea.value,
      style,
      y - rect.top - parseFloat(style.paddingTop) + textarea.scrollTop,
      rect.height
    )
  }

  const char = approximateCharacterIndexOffset(
    line.currentLine,
    style,
    x - rect.left - parseFloat(style.paddingLeft)
  )

  return (line.charIndex + char).coerceIn(0, textarea.value.length)
}

/**
 * Calculates which line is at the given y position, using the style's line height
 * @param value value of the textarea with \n line seperators
 * @param style textarea's computed styles
 * @param relativeY y position relative to the textarea
 * @returns value index of the first character in the selected line, and the line itself
 */
export function calculateLineIndexOffset(
  value: string,
  style: CSSStyleDeclaration,
  relativeY: number,
  containerHeight: number
) {
  const lineHeight =
    style.lineHeight === "normal" ? parseFloat(style.fontSize) * 1.5 : parseFloat(style.lineHeight)
  const maxVisibleLines = Math.floor(containerHeight / lineHeight)

  relativeY = relativeY.coerceIn(0, containerHeight - lineHeight)

  const line = Math.min(Math.floor(relativeY / lineHeight), maxVisibleLines - 1)
  const lines = value.split("\n")

  if (line >= lines.length)
    return {
      charIndex: value.length,
      currentLine: lines[lines.length - 1] || "",
    }

  const lineStartIndex = lines.slice(0, line).reduce((acc, line) => acc + line.length + 1, 0)

  return {
    charIndex: lineStartIndex,
    currentLine: lines[line] || "",
  }
}

/**
 * Approximates which character was selected in a given line based on an average character width
 * This works for monospace fonts (if the right character width is selected) but will break on inputs with standard fonts
 * @param selectedLine calculated selected line to limit character index
 * @param style textareaa's computed styles
 * @param relativeX x position relative to the textarea
 * @param charWidthFactor character width divided by font size for the selected font
 * @returns approximated selected character index in the current line
 */
export function approximateCharacterIndexOffset(
  selectedLine: string,
  style: CSSStyleDeclaration,
  relativeX: number
) {
  // Create a temporary span to measure one character
  const span = document.createElement("span")
  span.style.font = `${style.fontSize} ${style.fontFamily}`
  span.style.visibility = "hidden"
  span.textContent = "M"
  document.body.appendChild(span)
  const charWidth = span.getBoundingClientRect().width
  document.body.removeChild(span)

  // Calculate the character position based on click position
  const charPosition = relativeX / charWidth
  const charFloored = Math.floor(charPosition)
  const charFraction = charPosition - charFloored

  // If click is closer to the previous character
  let targetChar = charFraction < 0.5 ? charFloored : charFloored + 1

  return Math.min(targetChar, selectedLine.length)
}
