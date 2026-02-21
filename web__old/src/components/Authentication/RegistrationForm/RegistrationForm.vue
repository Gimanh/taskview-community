<template>
    <v-card elevation="0">
        <v-card-text class="pa-0">
            <v-form
                ref="form"
                v-model="valid"
                class="pa-2"
                @submit.prevent
            >
                <v-alert
                    v-model="showAlert"
                    :type="alertType"
                    dismissible
                >
                    <div>
                        {{ messageRegistration }}
                    </div>
                    <div>
                        {{ confirmMessage }}
                    </div>
                </v-alert>
                <v-text-field
                    v-model="email"
                    :label="emailLabel"
                    :rules="emailRule"
                    required
                    variant="underlined"
                    density="compact"
                />

                

                <v-text-field
                    v-model="password"
                    :label="passwordLabel"
                    :rules="credentialsRules"
                    :type="passwordType"
                    :append-inner-icon="passwordIcon"
                    required
                    variant="underlined"
                    density="compact"
                    @click:append-inner="inversePasswordType"
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
                />
            </v-form>
        </v-card-text>
        <v-card-actions v-if="valid">
            <v-spacer />
            <v-btn
                :disabled="checkInProcess || !valid"
                elevation="1"
                @click="submit"
            >
                {{ $t('msg.regAccount') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script src="./RegistrationForm.ts" lang="ts" />
