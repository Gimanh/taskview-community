<template>
    <v-dialog
        v-model="modelValue"
        width="500"
        persistent
    >
        <v-card>
            <v-card-title>
                {{ $t('msg.editing') }}
            </v-card-title>
            <v-card-text>
                <v-form>
                    <t-text-field
                        v-model="projectName"
                        :label="$t('msg.goal')"
                        :placeholder="$t('msg.goal')"
                    />
                    <t-text-field
                        v-model="projectDescription"
                        :label="$t('msg.description')"
                        :placeholder="$t('msg.description')"
                    />
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <tv-btn @click="cancel">
                    {{ $t('msg.cancel') }}
                </tv-btn>
                <tv-btn
                    :loading="loading"
                    @click="ok"
                >
                    {{ $t('msg.ok') }}
                </tv-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script src="./GoalEdit.ts" lang="ts" />
