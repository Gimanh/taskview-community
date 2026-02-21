import dagre from '@dagrejs/dagre';
import { type Edge, type Node, Position, useVueFlow } from '@vue-flow/core';
import { ref } from 'vue';

/**
 * Composable to run the layout algorithm on the graph.
 * It uses the `dagre` library to calculate the layout of the nodes and edges.
 */
export function useLayout() {
    const { findNode } = useVueFlow();

    const graph = ref(new dagre.graphlib.Graph());

    const previousDirection = ref('LR');

    function layout(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB') {
        // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
        const dagreGraph = new dagre.graphlib.Graph();

        graph.value = dagreGraph;

        dagreGraph.setDefaultEdgeLabel(() => ({}));

        const isHorizontal = direction === 'LR';
        dagreGraph.setGraph({
            rankdir: direction,
            // align: 'UL', // Align to upper left
            nodesep: 50, // Minimum space between nodes
            ranksep: 100, // Minimum space between ranks
            marginx: 20,
            marginy: 20,
        });

        previousDirection.value = direction;

        for (const node of nodes) {
            // if you need width+height of nodes for your layout, you can use the dimensions property of the internal node (`GraphNode` type)
            const graphNode = findNode(node.id);

            dagreGraph.setNode(node.id, {
                width: graphNode?.dimensions.width || 150,
                height: graphNode?.dimensions.height || 50,
            });
        }

        for (const edge of edges) {
            dagreGraph.setEdge(edge.source, edge.target);
        }

        dagre.layout(dagreGraph);

        // set nodes with updated positions
        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);

            return {
                ...node,
                targetPosition: isHorizontal ? Position.Left : Position.Top,
                sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
            };
        });

        // For TB mode, invert Y coordinates to put root at top
        if (!isHorizontal) {
            const maxY = Math.max(...layoutedNodes.map((node) => node.position.y));

            layoutedNodes.forEach((node) => {
                const graphNode = findNode(node.id);
                const nodeHeight = graphNode?.dimensions.height || 50;

                // Invert Y coordinate and adjust for node height to keep center aligned
                node.position.y = maxY - node.position.y + nodeHeight;
            });
        }

        return layoutedNodes;
    }

    // function layout(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB') {
    //     // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
    //     const dagreGraph = new dagre.graphlib.Graph()

    //     graph.value = dagreGraph

    //     dagreGraph.setDefaultEdgeLabel(() => ({}))

    //     const isHorizontal = direction === 'LR'
    //     dagreGraph.setGraph({ rankdir: direction })

    //     previousDirection.value = direction

    //     for (const node of nodes) {
    //         // if you need width+height of nodes for your layout, you can use the dimensions property of the internal node (`GraphNode` type)
    //         const graphNode = findNode(node.id)

    //         dagreGraph.setNode(node.id, { width: graphNode.dimensions.width || 150, height: graphNode.dimensions.height || 50 })
    //     }

    //     for (const edge of edges) {
    //         dagreGraph.setEdge(edge.source, edge.target)
    //     }

    //     dagre.layout(dagreGraph)

    //     // set nodes with updated positions
    //     return nodes.map((node) => {
    //         const nodeWithPosition = dagreGraph.node(node.id)

    //         return {
    //             ...node,
    //             targetPosition: isHorizontal ? Position.Left : Position.Top,
    //             sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    //             position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
    //         }
    //     })
    // }

    return { graph, layout, previousDirection };
}
