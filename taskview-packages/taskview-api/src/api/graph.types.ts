export type GraphArgAddEdge = {
    source: number;
    target: number;
}

export type GraphResponseAddEdge = {
    id: number;
    fromTaskId: number;
    toTaskId: number;
    nodeMetadata: object;
    createdAt: string;
}