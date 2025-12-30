<template>
    <div class="flex flex-col gap-4">
        <div
            class="px-2 text-gray-500 flex justify-center"
            @click="showSelectServer = !showSelectServer"
        >
            {{ $t('msg.serverNew') }}
        </div>

        <v-select
            v-show="showSelectServer"
            v-model="mainServer"
            :items="allServers"
            :label="$t('msg.server')"
            class="rad10-v-field h56"
            density="compact"
            variant="solo"
            hide-details
            @update:model-value="setMainServer(mainServer)"
        >
            <template #item="{ props }">
                <v-list-item v-bind="props">
                    <template
                        v-if="systemServer !== props.value"
                        #append
                    >
                        <v-btn
                            :icon="mdiMinus"
                            variant="outlined"
                            density="comfortable"
                            @click.prevent="deleteServer(props.value as string)"
                        />
                    </template>
                </v-list-item>
            </template>
            <template #append-item>
                <v-divider class="mt-2 mb-2" />
                <v-list-item>
                    <v-text-field
                        v-model="customServer"
                        :placeholder="$t('msg.serverNew')"
                        density="compact"
                        variant="outlined"
                        hide-details
                    />
                    <template #append>
                        <v-btn
                            :disabled="!customServer"
                            :icon="mdiPlus"
                            density="comfortable"
                            class="ml-2"
                            elevation="1"
                            variant="outlined"
                            @click="addServerLocal"
                        />
                    </template>
                </v-list-item>
                <v-divider class="mt-2" />
            </template>
        </v-select>
    </div>
</template>

<script setup async lang="ts">
import { mdiMinus, mdiPlus } from '@mdi/js';
import { ref } from 'vue';
import { useAdditionalServer } from '@/composition/useAdditionalServer';
import { isValidHttpUrl } from '@/helpers/Helper';
import { useI18n } from 'vue-i18n';

const { allServers, setMainServer, addServer, deleteServer, systemServer, mainServer } = await useAdditionalServer();
const $t = useI18n().t;
const customServer = ref('');

const showSelectServer = ref(false);

function addServerLocal() {
    if (isValidHttpUrl(customServer.value)) {
        addServer(customServer.value);
    } else {
        alert('Invalid URL. Please enter a valid URL with http or https protocol.');
    }
}

setMainServer(mainServer.value);
</script>
