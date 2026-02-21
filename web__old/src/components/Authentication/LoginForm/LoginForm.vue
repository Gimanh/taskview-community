<template>
    <v-card
        elevation="0"
        class="tv-login-form"
    >
        <v-card-text class="px-1">
            <v-form
                ref="form"
                v-model="valid"
                class="p-0 flex gap-5 flex-col"
                @submit.prevent
            >
                <v-text-field
                    v-model="login"
                    :placeholder="loginLabel"
                    :rules="credentialsRules"
                    variant="solo"
                    required
                    hide-details
                    class="rad10-v-field h56"
                />
                <v-text-field
                    v-model="password"
                    :placeholder="passwordLabel"
                    :rules="credentialsRules"
                    type="password"
                    variant="solo"
                    required
                    hide-details
                    class="rad10-v-field h56"
                />

                <Suspense>
                    <ServerSelection />
                </Suspense>
            </v-form>
        </v-card-text>
        <v-card-actions v-if="login && password">
            <v-spacer />
            <v-btn
                variant="tonal"
                @click="submit"
            >
                {{ $t('msg.enter') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script src="./LoginForm.ts" lang="ts" />

<style lang="scss">
.tv-login-form {
    .h56 {
        .v-input__control {
            height: 56px;
        }
    }
}

input:-webkit-autofill {
    background-color: transparent !important;
    color: inherit !important;
    font-size: inherit !important;
    border: inherit !important;
    box-shadow: none !important;
    border-radius: 10px;
}
</style>
