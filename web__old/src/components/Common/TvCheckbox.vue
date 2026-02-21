<template>
    <div
        class="cursor-pointer text-gray-400 overflow-hidden flex"
        @click.stop.prevent="toggle"
    >
        <motion.div 
            v-if="!localModel"
            v-bind="animation"
        >
            <svg
               
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="w-7 h-7"
            >
                <path
                    :d="mdiCheckboxBlankOutline"
                    fill="currentColor"
                />
            </svg>
        </motion.div>
        <motion.div 
            v-else
            v-bind="animation"
        >
            <svg
            
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="w-7 h-7"
            >
                <path
                    :d="mdiCheckboxMarked"
                    fill="currentColor"
                />
            </svg>
        </motion.div>
    </div>
</template>
  
<script setup lang="ts">
import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from '@mdi/js';
import { motion } from 'motion-v';
import { ref, watchEffect } from 'vue';

const model = defineModel<boolean>({ required: true });

const localModel = ref(model.value);

watchEffect(() => {
    localModel.value = model.value;
});

const props = withDefaults(defineProps<{ readonly?: boolean }>(), {
    readonly: false,
});

const animation = {
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    transition: {
        duration: 0.2,
        scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
    },
};

const toggle = () => {
    if (props.readonly) return;
    localModel.value = !localModel.value;
    setTimeout(() => {
        model.value = localModel.value;
    }, 300);
};
</script>
  