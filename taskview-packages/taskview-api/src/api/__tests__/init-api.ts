export const API_URL = 'http://localhost:1420';
export const DEFAULT_USER = 'user';
export const DEFAULT_USER_2 = 'user2';
export const DEFAULT_PASSWORD = 'user1!#Q';
import { TvApi } from '@/tv';
import axios from 'axios';
import { expect } from 'vitest';


const getAxios = (accessToken: string) => {
    const $axios = axios.create({
        baseURL: API_URL,
    });

    $axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    return $axios;
}

export const initApi = async () => {
    const authResponse = await axios.post(`${API_URL}/module/auth/login`, {
        login: DEFAULT_USER,
        password: DEFAULT_PASSWORD,
    });

    const authResponseForSecondUser = await axios.post(`${API_URL}/module/auth/login`, {
        login: DEFAULT_USER_2,
        password: DEFAULT_PASSWORD,
    });


    // You have to run the database with migration should be up and running before the test 
    const $tvApi = new TvApi(getAxios(authResponse.data.access));
    const $tvApiForSecondUser = new TvApi(getAxios(authResponseForSecondUser.data.access));

    expect(authResponse.data.access).toBeTruthy();
    expect(authResponse.data.refresh).toBeTruthy();
    expect(authResponse.data.userData.id).toBe(1);
    expect(authResponse.data.userData.email).toBe('test@mail.dest');

    const deleteAllGoals = async () => {
        for (const $api of [$tvApi, $tvApiForSecondUser]) {
            const goals = await $api.goals.fetchGoals().catch(console.error);
            if (!goals) {
                return;
            }
            for (const goal of goals) {
                await $api.goals.deleteGoal(goal.id).catch(console.error);
            }
        }
    }

    return {
        $tvApi,
        $tvApiForSecondUser,
        deleteAllGoals
    };
}