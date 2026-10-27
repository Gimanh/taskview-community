import type { AutomationRuleForClient, AutomationRuleRow, AutomationRuleShape } from './types';

export class AutomationRuleMapper {
    static toShape(row: AutomationRuleRow): AutomationRuleShape {
        return {
            id: row.id,
            trigger: { module: row.triggerModule, event: row.triggerEvent, params: row.triggerParams as Record<string, number> },
            action: { module: row.actionModule, action: row.actionName, params: row.actionParams as Record<string, number> },
        };
    }

    static toClient(row: AutomationRuleRow): AutomationRuleForClient {
        const shape = AutomationRuleMapper.toShape(row);
        return {
            id: row.id,
            goalId: row.goalId,
            creatorId: row.creatorId,
            name: row.name,
            enabled: row.enabled,
            trigger: shape.trigger,
            action: shape.action,
            createdAt: row.createdAt.toISOString(),
            editedAt: row.editedAt.toISOString(),
        };
    }
}
