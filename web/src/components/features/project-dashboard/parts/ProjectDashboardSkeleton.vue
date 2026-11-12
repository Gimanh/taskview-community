<template>
  <div
    class="flex flex-col gap-4"
    data-testid="project-dashboard-skeleton"
  >
    <div class="flex flex-col gap-4 lg:flex-row">
      <USkeleton class="rounded-3xl h-72 lg:flex-[7]" />
      <USkeleton class="rounded-3xl h-72 lg:flex-[5]" />
    </div>
    <div class="flex flex-col gap-4 lg:flex-row">
      <USkeleton class="rounded-3xl h-56 lg:flex-[4]" />
      <USkeleton class="rounded-3xl h-56 lg:flex-[5]" />
      <USkeleton class="rounded-3xl h-56 lg:flex-[3]" />
    </div>
    <USkeleton class="rounded-3xl h-52" />
  </div>
</template>
