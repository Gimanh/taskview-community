import dagre from '@dagrejs/dagre'
import { type Edge, type Node, Position } from '@vue-flow/core'

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

const ISOLATED_GAP_X = 40
const ISOLATED_GAP_Y = 32
const ISOLATED_BLOCK_OFFSET = 120
const ISOLATED_MIN_ROW_WIDTH = 1200

// Estimates the rendered TaskNode size from task data alone, so the layout can
// run before (and without) rendering every node — a prerequisite for
// only-render-visible-elements, where offscreen nodes are never measured.
function estimateNodeSize(node: Node): { width: number; height: number } {
  const task = node.data?.task
  if (!task) return { width: NODE_WIDTH, height: NODE_MIN_HEIGHT }

  const titleLines = Math.max(1, Math.ceil((task.description?.length ?? 0) / TITLE_CHARS_PER_LINE))

  // Estimated pixel widths of the badges TaskItem renders, in render order
  const badgeWidth = (labelLength: number) =>
    Math.min(CONTENT_WIDTH, BADGE_CHROME_WIDTH + labelLength * BADGE_CHAR_WIDTH)
  const badgeWidths: number[] = []
  if (task.endDate) badgeWidths.push(badgeWidth(11)) // dd.Mon.yyyy
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
      nodesep: 50, // Minimum space between nodes
      ranksep: 100, // Minimum space between ranks
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

    return [...layoutedConnected, ...layoutedIsolated]
  }

  return { layout }
}
