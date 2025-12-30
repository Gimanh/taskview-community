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
                        v-model="listName"
                        :label="$t('msg.goal')"
                        :placeholder="$t('msg.goal')"
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

<script src="./GoalListEdit.ts" lang="ts" />
