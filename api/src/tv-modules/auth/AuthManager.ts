import type { AppUser } from '../../core/AppUser';
import AuthModel from './AuthModel';
import { LoginAttempts } from './LoginAttempts';
import SessionStorage from './SessionStorage';

export class AuthManager {
    protected readonly user: AppUser;
    public readonly repository: AuthModel;
    public readonly sessionStorage: SessionStorage;
    public readonly loginAttempts: LoginAttempts;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new AuthModel();
        this.sessionStorage = new SessionStorage();
        this.loginAttempts = new LoginAttempts();
    }
}
