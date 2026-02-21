<template>
    <v-card elevation="0">
        <v-card-text class="pa-0">
            <v-form
                ref="form"
                v-model="valid"
                class="pa-2"
                @submit.prevent
            >
                <!--FIXME add density and variant to all fields-->
                <v-text-field
                    v-model="email"
                    :placeholder="emailLabel"
                    :rules="emailRule"
                    density="comfortable"
                    variant="solo"
                    required
                    hide-details
                    class="rad10-v-field h56"
                />
                <v-alert
                    v-if="emailSent"
                    :type="alertType"
                >
                    {{ alertInfo }}
                </v-alert>
            </v-form>
        </v-card-text>
        <v-card-actions>
            <v-btn
                icon
                fab
                @click="emitCancel"
            >
                <v-icon>
                    {{ mdiArrowLeft }}
                </v-icon>
            </v-btn>
            <v-spacer />
            <v-btn
                class="mr-4"
                elevation="1"
                :disabled="!valid"
                @click="submit"
            >
                {{ $t('msg.regRecover') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script src="./PasswordRecovery.ts" lang="ts" />
