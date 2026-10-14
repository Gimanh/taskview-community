export type AutomationModuleName = 'tasks' | 'kanban' | 'lists' | 'tags';

export type AutomationDataSourceName = 'kanban.statuses' | 'tags.goalTags' | 'lists.goalLists';

export type AutomationParams = Record<string, number>;

export type AutomationParamDefinition = {
    key: string;
    source: AutomationDataSourceName;
};

export type AutomationCatalogEvent = {
    name: string;
    params: AutomationParamDefinition[];
};

export type AutomationCatalogAction = {
    name: string;
    params: AutomationParamDefinition[];
    requiredPermissions: string[];
};

export type AutomationCatalogModule = {
    name: AutomationModuleName;
    events: AutomationCatalogEvent[];
    actions: AutomationCatalogAction[];
};

export type AutomationCatalog = {
    modules: AutomationCatalogModule[];
};

export type AutomationOption = {
    id: number;
    label: string;
    color?: string;
};

export type AutomationRuleTrigger = {
    module: string;
    event: string;
    params: AutomationParams;
};

export type AutomationRuleAction = {
    module: string;
    action: string;
    params: AutomationParams;
};

export type AutomationRule = {
    id: number;
    goalId: number;
    creatorId: number;
    name: string;
    enabled: boolean;
    trigger: AutomationRuleTrigger;
    action: AutomationRuleAction;
    createdAt: string;
    editedAt: string;
};

export type AutomationOptionsArgs = {
    goalId: number;
    source: AutomationDataSourceName;
};

export type AutomationRuleCreateArgs = {
    goalId: number;
    name: string;
    enabled?: boolean;
    trigger: AutomationRuleTrigger;
    action: AutomationRuleAction;
};

export type AutomationRuleUpdateArgs = {
    ruleId: number;
    name?: string;
    enabled?: boolean;
    trigger?: AutomationRuleTrigger;
    action?: AutomationRuleAction;
};

export type AutomationErrorCode = 'not_found' | 'forbidden' | 'invalid' | 'cycle' | 'limit_reached';

export type AutomationApiError = {
    code: AutomationErrorCode;
    message: string | null;
};
