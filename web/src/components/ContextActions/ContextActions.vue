<template>
    <v-menu
        v-model="dialogStatusModel"
        :activator="activator"
        location="bottom"
    >
        <v-list>
            <v-list-item
                v-for="item in actions"
                :key="item.id"
                :value="item.name"
                :disabled="item.disabled"
                @click="emitSelectedEvent(item.eventName)"
            >
                <template
                    v-if="item.icon"
                    #append
                >
                    <v-icon>
                        {{ item.icon }}
                    </v-icon>
                </template>
                <v-list-item-title>
                    {{ item.name }}
                </v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script src="./ContextActions.ts" lang="ts" />
