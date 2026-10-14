export type CentrifugoPublishPayload = {
    channel: string;
    data: Record<string, unknown>;
};

export type CentrifugoBroadcastPayload = {
    channels: string[];
    data: Record<string, unknown>;
};

export type CentrifugoApiCall =
    | { method: 'publish'; payload: CentrifugoPublishPayload }
    | { method: 'broadcast'; payload: CentrifugoBroadcastPayload };

export type CentrifugoBroadcastToUsersArgs = {
    userIds: number[];
    event: string;
    data: Record<string, unknown>;
};
