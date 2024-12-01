export var isSafari =
  typeof window !== "undefined" && typeof navigator !== "undefined"
    ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    : false
