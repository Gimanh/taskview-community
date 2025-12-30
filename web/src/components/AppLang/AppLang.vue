<template>
    <v-menu location="bottom">
        <template #activator="{ props }">
            <slot
                name="activator"
                v-bind="{ props }"
            >
                <v-btn
                    icon
                    v-bind="props"
                >
                    <v-icon>
                        {{ mdiWeb }}
                    </v-icon>
                </v-btn>
            </slot>
        </template>
        <v-list>
            <v-list-item
                v-for="(item, index) in items"
                :key="index"
                active-class="pink--text"
                @click="setLang(item)"
            >
                <v-list-item-title>
                    {{ item.title }}
                </v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script src="./AppLang.ts" lang="ts" />
