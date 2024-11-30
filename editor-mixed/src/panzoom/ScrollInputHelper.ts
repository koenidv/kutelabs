enum ScrollInputType {
  Mouse,
  Trackpad,
}

export class ScrollInputHelper {
  scrollInputType: ScrollInputType | null = null
  violationsCounter = 0
  lastInputTime = 0
  lastDecisionChange = 0

  determineInputType(evt: WheelEvent): ScrollInputType {
    let trackpadChance = 0.5
    if (Math.abs(evt.deltaY) < 12) trackpadChance = (trackpadChance + 1) / 2
    else trackpadChance /= 2
    if (Date.now() - this.lastInputTime < 25) trackpadChance = (trackpadChance + 1) / 2
    else if (Date.now() - this.lastInputTime < 300) trackpadChance /= 2
    if (evt.deltaY != 0 && evt.deltaX != 0) trackpadChance = (trackpadChance + 1) / 2

    const mightBeTrackpad = trackpadChance >= 0.5
    this.lastInputTime = Date.now()

    if (this.scrollInputType == null) {
      this.scrollInputType = mightBeTrackpad ? ScrollInputType.Trackpad : ScrollInputType.Mouse
      return this.scrollInputType
    }
    if (mightBeTrackpad === (this.scrollInputType === ScrollInputType.Trackpad)) {
      this.violationsCounter = 0
      return this.scrollInputType
    }
    if (this.violationsCounter > 5 && Date.now() - this.lastDecisionChange > 4000) {
      this.scrollInputType = mightBeTrackpad ? ScrollInputType.Trackpad : ScrollInputType.Mouse
      this.lastDecisionChange = Date.now()
      this.violationsCounter = 0
      return this.scrollInputType
    }
    if (mightBeTrackpad !== (this.scrollInputType === ScrollInputType.Trackpad)) {
      this.violationsCounter++
    }
    return this.scrollInputType
  }
}
