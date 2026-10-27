export type UserWithSession = {
  email: string
  login: string
  access: string
  refresh: string
}

export type ResetCodeRow = {
  remind_password_code: string | null
  remind_password_time: number | null
  password: string
}
