import type { Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { AllGoalPermissions } from '@/types/goals.types'

export type OnboardingPermission = keyof typeof AllGoalPermissions

export type OnboardingStepSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * Names of `data-tour` attributes. Of several names the first one on screen wins,
 * so a step can follow the user from a menu button to the item inside the opened menu
 */
export type OnboardingStepTargetNames = string | string[]

/** When the step points at different controls in the two layouts */
export type OnboardingStepTargetByLayout = {
  desktop?: OnboardingStepTargetNames
  mobile?: OnboardingStepTargetNames
}

export type OnboardingStepTarget = OnboardingStepTargetNames | OnboardingStepTargetByLayout

export type OnboardingStepSideByLayout = {
  desktop: OnboardingStepSide
  mobile: OnboardingStepSide
}

export type OnboardingStep = {
  id: string
  /** i18n keys */
  title: string
  body: string
  /**
   * Name of a `data-tour` attribute, or of a `tv-tour-<name>` class where a component has no element of its own
   * to carry an attribute. Without a target the step is shown in the middle of the screen
   */
  target?: OnboardingStepTarget
  side?: OnboardingStepSide | OnboardingStepSideByLayout
  /** Frames the target but keeps the popover at the bottom edge: for a step whose text also sends the user to what lies right under the target */
  dockPopover?: boolean
  /** Keeps a step without a target at the bottom edge, so the screen it talks about stays visible */
  docked?: boolean
  /** A step that is not available (no permission, nothing to work with) is passed over */
  available?: () => boolean
  /** Runs before the step is shown: brings the app to the screen the step needs */
  prepare?: () => void | Promise<void>
  /** Called when the step opens. The returned check tells whether the user has done what the step asks */
  watchDone?: () => () => boolean
  /** Without its control on screen the step has nothing to say: it is passed over instead of being shown unanchored */
  requiresTarget?: boolean
  /** The steps after this one have nothing to work with unless it is done: skipping it closes the tour */
  essential?: boolean
  /** Where "Next" takes the user when the step asks to open a screen */
  navigateTo?: () => RouteLocationRaw | null
}

export type OnboardingTopic = {
  id: string
  /** i18n keys */
  title: string
  description: string
  icon: string
  /** A function when the steps depend on something known only when the tour starts, such as how the user arranged a screen */
  steps: OnboardingStep[] | (() => OnboardingStep[])
}

/** Called once in the onboarding host's setup, so it may use composables and stores. */
export type OnboardingTopicsProvider = () => Ref<OnboardingTopic[]>

export type OnboardingTourResult = 'completed' | 'exited'

export type OnboardingStepDirection = 'forward' | 'back'

export type OnboardingEnterStepArgs = {
  index: number
  direction: OnboardingStepDirection
}

export type OnboardingTourEnd = {
  topicId: string
  result: OnboardingTourResult
}

export type OnboardingTourOptions = {
  onEnd: (end: OnboardingTourEnd) => void
  /** Whether closing this tour midway first asks if it should be offered again */
  confirmExit: (topicId: string) => boolean
}

export type OnboardingWaitForTargetArgs = {
  names: string[]
  timeoutMs: number
  isStale: () => boolean
}

export type OnboardingArea = {
  left: number
  top: number
  right: number
  bottom: number
}

export type OnboardingObstructionArgs = {
  active: () => boolean
  target: () => HTMLElement | null
}

/** Tells from the arguments of a store action whether the call is the one a step waits for */
export type OnboardingActionFilter = (args: unknown[]) => boolean

export const FIRST_RUN_TOPIC_ID = 'first-run'
