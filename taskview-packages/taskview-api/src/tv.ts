import TvTaskApi from "@/api/tasks";
import type { AxiosInstance } from "axios";
import TvGraph from "./api/graph";
import TvGoalApi from "./api/goals";
import { TvCollaborationApi } from "./api/collaboration";
import TvGoalListApi from "./api/goals-list";
import TvTagsApi from "./api/tags";
import TvKanban from "./api/kanban";

export class TvApi {

    protected $axios: AxiosInstance;

    public tasks: TvTaskApi;

    public graph: TvGraph;

    public goals: TvGoalApi;

    public collaboration: TvCollaborationApi;

    public goalLists: TvGoalListApi;

    public tags: TvTagsApi;

    public kanban: TvKanban;

    constructor($axios: AxiosInstance) {
        this.$axios = $axios;

        this.tasks = new TvTaskApi(this.$axios);

        this.graph = new TvGraph(this.$axios);

        this.goals = new TvGoalApi(this.$axios);

        this.collaboration = new TvCollaborationApi(this.$axios);

        this.goalLists = new TvGoalListApi(this.$axios);

        this.tags = new TvTagsApi(this.$axios);

        this.kanban = new TvKanban(this.$axios);
    }

    public setBaseUrl(baseUrl: string) {
        this.$axios.defaults.baseURL = baseUrl;
    }
}