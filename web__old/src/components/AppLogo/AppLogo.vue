<template>
    <v-toolbar-title>
        <div class="full-logo d-flex align-center">
            <!-- eslint-disable vue/no-v-html -->
            <div
                class="full-logo__logo"
                v-html="logo"
            />
        </div>
    </v-toolbar-title>
</template>

<script setup lang="ts">
import logo from './tv-grouped-logo.svg?raw';
</script>

<style lang="scss">
.v-theme--dark {
    #svg-logo-text {
        fill: #fff;
    }
}
.full-logo {
    &__logo {
        height: 56px;
        svg {
            height: 100%;
            width: 156px;
        }
    }
    /*&__circle {
        line-height: 0;
        svg {
            width: 40px;
            height: 40px;
        }
    }
    &__text {
        line-height: 0;
        width: fit-content;
        margin-left: 17px;
        svg {
            height: 25px;
            width: fit-content;
        }
    }*/

    .v-theme--dark &__text {
        svg > path {
            fill: #fff;
        }
    }
}
</style>
