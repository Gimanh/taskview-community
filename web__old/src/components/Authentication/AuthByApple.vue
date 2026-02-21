<template>
    <ExternalAuthBaseBtn
        class="gsi-material-button"
        provider="apple"
    >
        <template #icon>
            <svg
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 48 48"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  style="display: block;"
>
  <path
    fill="#000000"
    d="M31.03 12.74c1.73-2.1 2.89-5.03 2.57-7.95-2.5.1-5.51 1.67-7.3 3.77-1.6 1.86-3 4.84-2.62 7.7 2.79.22 5.55-1.42 7.35-3.52zM37.63 24.91c-.1-5.7 4.65-8.44 4.87-8.57-2.65-3.88-6.78-4.42-8.23-4.48-3.5-.36-6.83 2.06-8.6 2.06-1.77 0-4.52-2.01-7.42-1.95-3.81.06-7.33 2.21-9.29 5.62-3.96 6.86-1.01 17.02 2.84 22.6 1.88 2.73 4.11 5.79 7.05 5.68 2.83-.11 3.9-1.83 7.32-1.83 3.42 0 4.39 1.83 7.38 1.77 3.05-.06 4.98-2.77 6.85-5.52 2.17-3.17 3.06-6.24 3.11-6.4-.07-.03-5.98-2.3-6.08-9z"
  />
</svg>

        </template>
        <span>Sign in with Apple</span>
    </ExternalAuthBaseBtn>
</template>
<script lang="ts" setup>
import ExternalAuthBaseBtn from '@/components/Authentication/ExternalAuthBaseBtn.vue';
</script>