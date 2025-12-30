import { passwordStrength } from 'check-password-strength';

export default class PasswordHelper {
    static check(password: string): boolean {
        const result = passwordStrength<'Strong' | 'Medium' | 'Weak' | 'Too weak'>(password);
        return result.id >= 1;
    }
}
