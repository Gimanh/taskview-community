import { AppUser } from '../../core/AppUser';
import { GoalsRepository } from '../goals/GoalsRepository';

export class AutomationActorFactory {
    private readonly goalsRepository = new GoalsRepository();

    async forGoalOwner(goalId: number): Promise<AppUser | null> {
        const goal = await this.goalsRepository.findGoalById(goalId);
        if (!goal) return null;
        return this.forUser(goal.owner);
    }

    private async forUser(userId: number): Promise<AppUser | null> {
        const user = await new AppUser().authManager.repository.fetchUserById(userId);
        if (!user || user.block !== 0) return null;

        const actor = new AppUser({ id: 0, userData: { id: user.id, login: user.login, email: user.email } });
        actor.setUserDataFromDb(user);
        return actor;
    }
}
