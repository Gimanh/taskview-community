import { $ls } from '@/plugins/axios';

export default async function authenticated() {
    await $ls.updateUserStoreByToken();
    if (!(await $ls.getToken())) {
        console.warn('authenticated');
        return { name: 'login' };
    }
    return true;
}
