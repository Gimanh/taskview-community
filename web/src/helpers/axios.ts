import axios from 'axios';
import { useTaskViewMainUrl } from '@/composition/useTaskViewMainUrl';

const $api = axios.create({
    baseURL: useTaskViewMainUrl(),
});

export default $api;
