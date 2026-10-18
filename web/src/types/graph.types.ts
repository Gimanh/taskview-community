import type { Edge, Node, XYPosition } from '@vue-flow/core'
import type { TaskItem } from './tasks.types'

export type GraphDirection = 'LR' | 'TB';

// Which side of an existing task a new one goes: before it (a predecessor) or after it (a successor)
export type GraphPlacementSide = 'before' | 'after';

export type GraphStore = {
    nodes: Node[];
    edges: Edge[];
    allNodes: Node[];
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

export type GraphPlaceNodeNearArgs = {
    anchor: Node;
    node: Pick<Node, 'data'>;
    side: GraphPlacementSide;
    direction: GraphDirection;
    obstacles: Node[];
};
