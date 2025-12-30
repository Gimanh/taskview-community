import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import $api from '@/helpers/axios';
import { $ls, $tvApi } from '@/plugins/axios';
import { additionalUrlStore } from '@/stores/additional-url.store';

export const LS_KEY_ADDITIONAL_SERVERS = 'additionalServers';
export const LS_KEY_MAIN_SERVER = 'mainServer';

/**
 * Use this composition to get and set additional servers and main server for API requests
 * User can add additional servers and set main server from local storage
 * Also user can delete additional server
 * @returns
 */
export const useAdditionalServer = async () => {
    const { allServers, mainServer, systemServer } = storeToRefs(additionalUrlStore());
    const serversFromLocalStorage = ref<string | null>(await $ls.getValue(LS_KEY_ADDITIONAL_SERVERS));
    const mainServerFromLocalStorage = await $ls.getValue(LS_KEY_MAIN_SERVER);

    allServers.value = serversFromLocalStorage.value ? [...JSON.parse(serversFromLocalStorage.value)] : [];

    mainServer.value =
        mainServerFromLocalStorage ||
        (process.env.NODE_ENV !== 'production' ? 'http://localhost:1401' : 'https://apitaskview.handscream.com');

    systemServer.value =
        process.env.NODE_ENV !== 'production' ? 'http://localhost:1401' : 'https://apitaskview.handscream.com';

    const setMainServer = (server: string) => {
        mainServer.value = server;
        $ls.setValue(LS_KEY_MAIN_SERVER, server);
        $api.defaults.baseURL = server;
        $tvApi?.setBaseUrl(server);
    };

    const addServer = (server: string) => {
        allServers.value.push(server);
        $ls.setValue(LS_KEY_ADDITIONAL_SERVERS, allServers.value);
    };

    const deleteServer = (server: string) => {
        allServers.value = allServers.value.filter((s) => s !== server);
        $ls.setValue(LS_KEY_ADDITIONAL_SERVERS, allServers.value);

        if (mainServer.value === server) {
            setMainServer(systemServer.value);
        }
    };

    return {
        mainServer,
        allServers,
        setMainServer,
        addServer,
        systemServer,
        deleteServer,
    };
};
