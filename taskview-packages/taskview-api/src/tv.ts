import TvTaskApi from "@/api/tasks";
import type { AxiosInstance } from "axios";
import TvGraph from "./api/graph";
import TvGoalApi from "./api/goals";
import { TvCollaborationApi } from "./api/collaboration";
import TvGoalListApi from "./api/goals-list";
import TvTagsApi from "./api/tags";
import TvIntegrationsApi from "./api/integrations";
import TvKanban from "./api/kanban";
import TvNotificationsApi from "./api/notifications";
import TvWebhooks from "./api/webhooks";

export class TvApi {

    protected $axios: AxiosInstance;

    public tasks: TvTaskApi;

    public graph: TvGraph;

    public goals: TvGoalApi;

    public collaboration: TvCollaborationApi;

    public goalLists: TvGoalListApi;

    public tags: TvTagsApi;

    public kanban: TvKanban;

    public integrations: TvIntegrationsApi;

    public notifications: TvNotificationsApi;

    public webhooks: TvWebhooks;

    constructor($axios: AxiosInstance) {
        this.$axios = $axios;

        this.tasks = new TvTaskApi(this.$axios);

        this.graph = new TvGraph(this.$axios);

        this.goals = new TvGoalApi(this.$axios);

        this.collaboration = new TvCollaborationApi(this.$axios);

        this.goalLists = new TvGoalListApi(this.$axios);

        this.tags = new TvTagsApi(this.$axios);

        this.kanban = new TvKanban(this.$axios);

        this.integrations = new TvIntegrationsApi(this.$axios);

        this.notifications = new TvNotificationsApi(this.$axios);

        this.webhooks = new TvWebhooks(this.$axios);
    }

    public setBaseUrl(baseUrl: string) {
        this.$axios.defaults.baseURL = baseUrl;
    }
}