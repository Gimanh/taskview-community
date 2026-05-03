<template>
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <USkeleton v-for="i in 4" :key="`kpi-${i}`" class="h-28 rounded-lg" />
    </div>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <USkeleton v-for="i in 6" :key="`chart-${i}`" class="h-72 rounded-lg" />
    </div>
  </div>
</template>
