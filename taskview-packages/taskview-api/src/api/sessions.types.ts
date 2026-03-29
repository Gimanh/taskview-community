export type SessionItem = {
  id: number
  deviceName: string | null
  userIp: string | null
  createdAt: string
  lastUsedAt: string | null
  isCurrent: boolean
}
