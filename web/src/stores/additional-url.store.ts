import { defineStore } from 'pinia'
import { ref } from 'vue'

export const additionalUrlStore = defineStore('additionalUrlStore', () => {
  const allServers = ref<string[]>([])
  const mainServer = ref<string>('')
  const systemServer = ref<string>('')

  return { allServers, mainServer, systemServer }
})
