import type { AppUser } from '../../core/AppUser';
import AuthModel from './AuthModel';
import SessionStorage from './SessionStorage';

export class AuthManager {
    protected readonly user: AppUser;
    public readonly repository: AuthModel;
    public readonly sessionStorage: SessionStorage;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new AuthModel();
        this.sessionStorage = new SessionStorage();
    }
}
