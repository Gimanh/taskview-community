import dagre from '@dagrejs/dagre'
import { type Edge, type GraphNode, type Node, Position, type XYPosition } from '@vue-flow/core'
import type { GraphPlaceNodeNearArgs } from '@/types/graph.types'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

const NODE_WIDTH = 288 // w-72 wrapper in TaskNode
const NODE_MIN_HEIGHT = 74 // checkbox + priority column with paddings
const NODE_PADDING_Y = 28 // p-3.5 top + bottom
const TITLE_LINE_HEIGHT = 24 // text-base
// Conservative: word-wrapping rarely fills lines completely, better to
// overestimate height than to let ranks overlap
const TITLE_CHARS_PER_LINE = 22
const BADGE_ROW_HEIGHT = 30
const BADGE_ROW_GAP = 8
const TITLE_BADGES_GAP = 4
// Handles stick out ~8px beyond the card on both sides, and the height estimate
// can be off by a line — this safety margin keeps neighbors from touching
const NODE_SAFETY = 24
const CONTENT_WIDTH = 230 // node width minus paddings and the checkbox column
const BADGE_CHROME_WIDTH = 34 // badge paddings + icon
const BADGE_CHAR_WIDTH = 6.5
const BADGE_GAP = 8

export const NODE_SEP = 50 // minimum space between nodes of one rank
export const RANK_SEP = 100 // minimum space between ranks

const ISOLATED_GAP_X = 40
const ISOLATED_GAP_Y = 32
const ISOLATED_BLOCK_OFFSET = 120
const ISOLATED_MIN_ROW_WIDTH = 1200

// Estimates the rendered TaskNode size from task data alone, so the layout can
// run before (and without) rendering every node — a prerequisite for
// only-render-visible-elements, where offscreen nodes are never measured.
export function estimateNodeSize(node: Pick<Node, 'data'>): { width: number; height: number } {
  const task = node.data?.task
  if (!task) return { width: NODE_WIDTH, height: NODE_MIN_HEIGHT }

  const titleLines = Math.max(1, Math.ceil((task.description?.length ?? 0) / TITLE_CHARS_PER_LINE))

  // Estimated pixel widths of the badges TaskItem renders, in render order
  const badgeWidth = (labelLength: number) =>
    Math.min(CONTENT_WIDTH, BADGE_CHROME_WIDTH + labelLength * BADGE_CHAR_WIDTH)
  const badgeWidths: number[] = []
  if (useUiPreferencesStore().settings.showTaskId === 1) badgeWidths.push(badgeWidth(String(task.id).length))
  if (task.endDate) badgeWidths.push(badgeWidth(task.startDate ? 25 : 11)) // dd.Mon.yyyy, or dd.Mon.yyyy → dd.Mon.yyyy
  if (task.recurrenceRuleId) badgeWidths.push(BADGE_CHROME_WIDTH) // icon-only
  if (task.goalListId) badgeWidths.push(badgeWidth(10)) // list name (unknown here)
  if (task.amount) badgeWidths.push(badgeWidth(String(task.amount).length + 1))
  for (let i = 0; i < (task.assignedUsers?.length ?? 0); i++) badgeWidths.push(badgeWidth(20)) // email
  for (let i = 0; i < (task.tags?.length ?? 0); i++) badgeWidths.push(badgeWidth(9)) // tag name (unknown here)

  // Greedy flex-wrap simulation: how many rows the badges take
  let badgeRows = 0
  let rowRemaining = 0
  for (const width of badgeWidths) {
    if (width + (badgeRows === 0 || rowRemaining === CONTENT_WIDTH ? 0 : BADGE_GAP) > rowRemaining) {
      badgeRows += 1
      rowRemaining = CONTENT_WIDTH - width
    } else {
      rowRemaining -= width + BADGE_GAP
    }
  }

  const height =
    NODE_PADDING_Y +
    titleLines * TITLE_LINE_HEIGHT +
    (badgeRows > 0 ? TITLE_BADGES_GAP + badgeRows * BADGE_ROW_HEIGHT + (badgeRows - 1) * BADGE_ROW_GAP : 0)

  return { width: NODE_WIDTH, height: Math.max(NODE_MIN_HEIGHT, height) + NODE_SAFETY }
}

// The rendered size once vue-flow has measured the node, the estimate before that
export function nodeSize(node: Node): { width: number; height: number } {
  const { dimensions } = node as Partial<GraphNode>
  if (dimensions?.width && dimensions.height) return { width: dimensions.width, height: dimensions.height }
  return estimateNodeSize(node)
}

// Center of the node closest to the middle of the laid-out graph. The middle itself can
// be empty (say, between the linked graph and the grid of isolated tasks below it), the
// node never is. Read from positions and estimates only, so it does not depend on what
// vue-flow has measured so far
export function layoutCenter(nodes: Node[]): XYPosition {
  if (!nodes.length) return { x: 0, y: 0 }
  const rects = nodes.map((node) => ({ ...node.position, ...estimateNodeSize(node) }))
  const centers = rects.map((rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }))
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  const middle = { x: (left + right) / 2, y: (top + bottom) / 2 }
  const distance = (point: XYPosition) => Math.hypot(point.x - middle.x, point.y - middle.y)
  return centers.reduce((closest, point) => (distance(point) < distance(closest) ? point : closest))
}

// The spot one rank before or after the anchor, centered on it; when that spot is taken
// it slides along the rank to the nearest free one. Successors go right in LR and up in TB
// (the TB layout is inverted: roots sit at the bottom, matching TaskNode's handles)
export function placeNodeNear({ anchor, node, side, direction, obstacles }: GraphPlaceNodeNearArgs): XYPosition {
  const anchorSize = nodeSize(anchor)
  const size = estimateNodeSize(node)
  const isHorizontal = direction === 'LR'
  const towardsEnd = isHorizontal ? side === 'after' : side === 'before'

  const origin = isHorizontal
    ? {
      x: towardsEnd ? anchor.position.x + anchorSize.width + RANK_SEP : anchor.position.x - RANK_SEP - size.width,
      y: anchor.position.y + (anchorSize.height - size.height) / 2,
    }
    : {
      x: anchor.position.x + (anchorSize.width - size.width) / 2,
      y: towardsEnd ? anchor.position.y + anchorSize.height + RANK_SEP : anchor.position.y - RANK_SEP - size.height,
    }

  const rects = obstacles.map((item) => ({ ...item.position, ...nodeSize(item) }))
  const isFree = (position: XYPosition) =>
    rects.every(
      (rect) =>
        position.x + size.width + NODE_SEP <= rect.x ||
        rect.x + rect.width + NODE_SEP <= position.x ||
        position.y + size.height + NODE_SEP <= rect.y ||
        rect.y + rect.height + NODE_SEP <= position.y,
    )

  // The nearest free spot is either the centered one or flush against a side of some node
  const axis = isHorizontal ? 'y' : 'x'
  const extent = isHorizontal ? 'height' : 'width'
  const candidates = [origin[axis]]
  for (const rect of rects) {
    candidates.push(rect[axis] - NODE_SEP - size[extent], rect[axis] + rect[extent] + NODE_SEP)
  }
  candidates.sort((a, b) => Math.abs(a - origin[axis]) - Math.abs(b - origin[axis]))

  for (const value of candidates) {
    const position = { ...origin, [axis]: value }
    if (isFree(position)) return position
  }
  return origin
}

/**
 * Composable to run the layout algorithm on the graph.
 * Connected nodes are laid out with `dagre`; isolated nodes (no edges) are
 * arranged in a grid below the graph so they don't push linked nodes apart.
 * Node sizes are estimated from data, so no prior render is required.
 */
export function useLayout() {
  function layout(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB') {
    const isHorizontal = direction === 'LR'

    // Isolated nodes would become extra dagre roots and push linked nodes apart —
    // lay out only the connected subgraph, grid the rest separately
    const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]))
    const connectedNodes = nodes.filter((node) => connectedIds.has(node.id))
    const isolatedNodes = nodes.filter((node) => !connectedIds.has(node.id))

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: NODE_SEP,
      ranksep: RANK_SEP,
      marginx: 20,
      marginy: 20,
    })

    for (const node of connectedNodes) {
      dagreGraph.setNode(node.id, estimateNodeSize(node))
    }
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    dagre.layout(dagreGraph)

    // dagre returns node centers — keep them as centers for the TB inversion below
    const layoutedConnected = connectedNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
      }
    })

    // For TB mode, invert Y coordinates to put root at top
    if (!isHorizontal) {
      const maxY = Math.max(...layoutedConnected.map((node) => node.position.y))

      layoutedConnected.forEach((node) => {
        node.position.y = maxY - node.position.y
      })
    }

    // Convert centers to top-left corners (what vue-flow positions actually are)
    layoutedConnected.forEach((node) => {
      const { width, height } = estimateNodeSize(node)
      node.position.x -= width / 2
      node.position.y -= height / 2
    })

    // Grid for isolated nodes below the connected graph
    const hasConnected = layoutedConnected.length > 0
    const boundsBottom = hasConnected
      ? Math.max(...layoutedConnected.map((node) => node.position.y + estimateNodeSize(node).height))
      : 0
    const boundsLeft = hasConnected
      ? Math.min(...layoutedConnected.map((node) => node.position.x))
      : 0
    const boundsWidth = hasConnected
      ? Math.max(...layoutedConnected.map((node) => node.position.x + estimateNodeSize(node).width)) - boundsLeft
      : 0
    const rowWidth = Math.max(boundsWidth, ISOLATED_MIN_ROW_WIDTH)

    let x = boundsLeft
    let y = boundsBottom + (hasConnected ? ISOLATED_BLOCK_OFFSET : 0)
    let rowHeight = 0

    const layoutedIsolated = isolatedNodes.map((node) => {
      const { width, height } = estimateNodeSize(node)

      if (x > boundsLeft && x + width > boundsLeft + rowWidth) {
        x = boundsLeft
        y += rowHeight + ISOLATED_GAP_Y
        rowHeight = 0
      }

      const position = { x, y }
      x += width + ISOLATED_GAP_X
      rowHeight = Math.max(rowHeight, height)

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position,
      }
    })

    // vue-flow merges these into its nodes and refreshes computedPosition only for
    // rendered ones, yet culls by computedPosition under only-render-visible-elements:
    // a stale one would keep a node that moved into view from ever rendering
    return [...layoutedConnected, ...layoutedIsolated].map((node) => ({
      ...node,
      computedPosition: { z: (node as Partial<GraphNode>).computedPosition?.z ?? 0, ...node.position },
    }))
  }

  return { layout }
}
