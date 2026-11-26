import type { Edge, Node, XYPosition } from '@vue-flow/core'
import type { TaskItem } from './tasks.types'

export type GraphDirection = 'LR' | 'TB';

// Which side of an existing task a new one goes: before it (a predecessor) or after it (a successor)
export type GraphPlacementSide = 'before' | 'after';

// Without domAttributes: motion-v types its attributes with a class, which Pinia's state unwrapping cannot keep
export type GraphNode = Omit<Node, 'domAttributes'>;

export type GraphStore = {
    nodes: GraphNode[];
    edges: Edge[];
    allNodes: GraphNode[];
    allEdges: Edge[];
    goalId: number | null;
    direction: GraphDirection;
};

export type GraphInsertTaskArgs = {
    task: TaskItem;
    position?: XYPosition | null;
};

export type GraphPositionNearArgs = {
    taskId: number;
    task: TaskItem;
    side: GraphPlacementSide;
};

export type GraphPlaceNodeFreeArgs = {
    /** wanted top-left corner of the new node */
    target: XYPosition;
    node: Pick<Node, 'data'>;
    obstacles: Node[];
};

export type GraphPlaceNodeNearArgs = {
    anchor: Node;
    node: Pick<Node, 'data'>;
    side: GraphPlacementSide;
    direction: GraphDirection;
    obstacles: Node[];
};
