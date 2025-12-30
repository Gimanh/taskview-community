import axios, { type AxiosResponse } from 'axios';
import type { AppResponse } from './base.types';

export default class TvApiBase {
    protected $axios;

    constructor(axiosApi: ReturnType<typeof axios.create>) {
        this.$axios = axiosApi;
    }

    protected async request<T>(promise: Promise<AxiosResponse<AppResponse<T>>>): Promise<T> {
        const res = await promise
        return res.data.response
    }
}