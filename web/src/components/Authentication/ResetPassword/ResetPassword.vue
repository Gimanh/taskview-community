<template>
    <v-card elevation="0">
        <v-card-text class="pa-0">
            <v-form
                ref="form"
                v-model="valid"
                validate-on="input"
                class="pa-2"
                @submit.prevent
            >
                <v-alert
                    v-if="!reset"
                    type="info"
                >
                    {{ errorResetAlert }}
                </v-alert>

                <v-text-field
                    v-model="password"
                    :label="passwordLabel"
                    :rules="passwordRules"
                    :type="passwordType"
                    :append-inner-icon="passwordIcon"
                    required
                    variant="underlined"
                    density="compact"
                    spellcheck="false"
                    @click:append-inner="inversePasswordType"
                    @update:model-value="validate"
                />
                <v-text-field
                    v-model="passwordRepeat"
                    :label="passwordLabelRepeat"
                    :rules="passwordRepeatRule"
                    :type="passwordRepeatType"
                    :append-inner-icon="passwordRepeatIcon"
                    required
                    variant="underlined"
                    density="compact"
                    @click:append-inner="inversePasswordRepeatType"
                    @update:model-value="validate"
                />
            </v-form>
        </v-card-text>
        <v-card-actions>
            <v-btn
                icon
                fab
                @click="cancel"
            >
                <v-icon> {{ mdiArrowLeft }} </v-icon>
            </v-btn>
            <v-spacer />
            <v-btn
                v-if="valid"
                class="mr-4"
                @click="submit"
            >
                {{ $t('msg.update') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script src="./ResetPassword.ts" lang="ts" />
