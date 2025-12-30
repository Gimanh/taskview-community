<template>
    <v-checkbox-btn
        v-bind="$attrs"
        density="compact"
        hide-details
        @update:model-value="updateStatus($event as boolean)"
    >
        <!-- @vue-skip -->
        <!-- <template v-for="(_, name) in $slots"
                  v-slot:[name]="slotData"
                  :slot="name">
            <slot :name="name"
                  v-bind="slotData" />
        </template> -->
    </v-checkbox-btn>
</template>

<script setup lang="ts">
const emit = defineEmits<(e: 'change', status: boolean) => void>();

function updateStatus(event: boolean) {
    emit('change', event);
}
</script>
