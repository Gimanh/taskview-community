import { kanbanAutomations } from '../automations/KanbanAutomations';
import { listsAutomations } from '../automations/ListsAutomations';
import { tagsAutomations } from '../automations/TagsAutomations';
import { tasksAutomations } from '../automations/TasksAutomations';
import type {
    AutomationActionDefinition,
    AutomationBusEventName,
    AutomationCatalogForClient,
    AutomationDataSource,
    AutomationDataSourceName,
    AutomationEventDefinition,
    AutomationFindActionArgs,
    AutomationFindEventArgs,
    AutomationModuleDefinition,
} from '../types';

export class AutomationCatalog {
    private readonly modules: AutomationModuleDefinition[];

    constructor(modules: AutomationModuleDefinition[] = [tasksAutomations, kanbanAutomations, listsAutomations, tagsAutomations]) {
        this.modules = modules;
    }

    findEvent(args: AutomationFindEventArgs): AutomationEventDefinition | null {
        const module = this.modules.find((item) => item.name === args.module);
        return module?.events.find((item) => item.name === args.event) ?? null;
    }

    findAction(args: AutomationFindActionArgs): AutomationActionDefinition | null {
        const module = this.modules.find((item) => item.name === args.module);
        return module?.actions.find((item) => item.name === args.action) ?? null;
    }

    findDataSource(name: AutomationDataSourceName): AutomationDataSource | null {
        for (const module of this.modules) {
            if (Object.prototype.hasOwnProperty.call(module.dataSources, name)) return module.dataSources[name] ?? null;
        }
        return null;
    }

    listensTo(busEvent: AutomationBusEventName): boolean {
        return this.modules.some((module) => module.events.some((event) => event.busEvents.includes(busEvent)));
    }

    toClient(): AutomationCatalogForClient {
        return {
            modules: this.modules.map((module) => ({
                name: module.name,
                events: module.events.map((event) => ({ name: event.name, params: event.params })),
                actions: module.actions.map((action) => ({ name: action.name, params: action.params, requiredPermissions: action.requiredPermissions })),
            })),
        };
    }
}

export const automationCatalog = new AutomationCatalog();
