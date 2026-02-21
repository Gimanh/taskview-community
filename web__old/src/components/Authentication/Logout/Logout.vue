<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <v-btn
        icon
        fab
        @click="logout"
    >
        <v-icon>
            {{ mdiExitToApp }}
        </v-icon>
    </v-btn>
</template>

<script src="./Logout.ts" lang="ts" />
