<template>
    <v-dialog
        v-model="modelValue"
        width="500"
        persistent
    >
        <v-card>
            <v-card-title>
                {{ title }}
            </v-card-title>
            <v-divider />
            <v-card-text>
                {{ text }}
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <tv-btn @click="cancel">
                    {{ $t('msg.cancel') }}
                </tv-btn>
                <tv-btn @click="ok">
                    {{ $t('msg.ok') }}
                </tv-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script src="./FormDelete.ts" lang="ts" />
