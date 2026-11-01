import { computed, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { CalendarCardTitleLinesArgs } from '@/types/calendar.types'

// How many whole lines of the title fit between its top and the card's bottom padding,
// so a tall event's title ends on an ellipsis instead of a line cut in half
export function useCalendarCardTitleLines(args: CalendarCardTitleLinesArgs): Ref<number | undefined> {
  const { height } = useElementSize(args.card)

  return computed(() => {
    const card = args.card.value
    const title = args.title.value
    if (!args.enabled.value || !card || !title || !height.value) return undefined
    const lineHeight = parseFloat(getComputedStyle(title).lineHeight)
    const paddingTop = parseFloat(getComputedStyle(card).paddingTop)
    const room = paddingTop + height.value - title.offsetTop
    return Math.max(1, Math.floor(room / lineHeight))
  })
}
