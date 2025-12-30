import type { AppUser } from '../../core/AppUser';
import AuthModel from './AuthModel';
import JwtStorage from './JwtStorage';

export class AuthManager {
    protected readonly user: AppUser;
    public readonly repository: AuthModel;
    public readonly jwtStorage: JwtStorage;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new AuthModel();
        this.jwtStorage = new JwtStorage();
    }
}
