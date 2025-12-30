import TvApiBase from './base';
import type { GraphArgAddEdge, GraphResponseAddEdge } from '@/api/graph.types';
import type { AppResponse } from '@/api/base.types';

export default class TvGraph extends TvApiBase {
    protected moduleUrl = '/module/graph';

    public async addEdge(data: GraphArgAddEdge) {
        return this.request(
            this.$axios.post<AppResponse<GraphResponseAddEdge>>(
                `${this.moduleUrl}`, data
            )
        );
    }

    public async fetchAllEdges(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<GraphResponseAddEdge[]>>(
                `${this.moduleUrl}/${goalId}`
            )
        );
    }

    public async deleteEdge(id: number) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(
                `${this.moduleUrl}/${id}`
            )
        );
    }
}