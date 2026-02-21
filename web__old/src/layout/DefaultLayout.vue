<template>
    <v-app>
        <v-app-bar
            :clipped-left="true"
            fixed
            app
            elevation="1"
        >
            <!-- <v-app-bar-nav-icon variant="text" @click.stop="appStore.setDrawer(!appStore.drawer)" /> -->

            <div class="ml-3">
                <app-logo />
            </div>
            <v-spacer />
            <div>
                <v-btn
                    fab
                    icon
                    @click="toggleTheme"
                >
                    <v-icon>
                        {{ mdiInvertColors }}
                    </v-icon>
                </v-btn>
            </div>
            <div class="app-lang">
                <app-lang />
            </div>
            <div class="mr-2">
                <app-logout v-if="isLoggedIn" />
            </div>
            <div>
                <!-- <v-btn v-if="!isLoggedIn" @click="goToLoginPage">
                    {{ $t('msg.login') }}
                </v-btn> -->
            </div>
        </v-app-bar>
        <v-main>
            <v-container
                fluid
                class="ma-0 pa-1 app-main-container overflow-auto"
            >
                <slot />
            </v-container>
        </v-main>
    </v-app>
</template>
<script src="./DefaultLayout.ts" lang="ts" />
