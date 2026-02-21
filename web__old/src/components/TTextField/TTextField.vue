<template>
    <component
        :is="component"
        v-bind="$attrs"
        :model-value="modelValue"
        @input="$emit('update:modelValue',$event.target.value)"
    />
</template>

<script src="./TTextField.ts" lang="ts" />
