import axios from 'axios';
import { useTaskViewMainUrl } from '@/composition/useTaskViewMainUrl';

const $api = axios.create({
    withCredentials: true,
    baseURL: useTaskViewMainUrl(),
    timeout: 10000,
});

export default $api;
