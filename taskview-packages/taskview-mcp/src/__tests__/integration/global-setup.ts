import axios from 'axios'

const TASKVIEW_URL = process.env.TASKVIEW_URL
const TASKVIEW_LOGIN = process.env.TASKVIEW_LOGIN
const TASKVIEW_PASSWORD = process.env.TASKVIEW_PASSWORD
const TASKVIEW_TOKEN_PROVIDED = process.env.TASKVIEW_TOKEN

let createdTokenId: number | null = null
let createdToken: string | null = null

export async function setup() {
  if (!TASKVIEW_URL) return
  if (TASKVIEW_TOKEN_PROVIDED) return
  if (!TASKVIEW_LOGIN || !TASKVIEW_PASSWORD) return

  const loginRes = await axios.post(`${TASKVIEW_URL}/module/auth/login`, {
    login: TASKVIEW_LOGIN,
    password: TASKVIEW_PASSWORD,
  })
  const jwt = loginRes.data.access
  if (!jwt) throw new Error('Login succeeded but no access token returned')

  const tokenRes = await axios.post(
    `${TASKVIEW_URL}/module/api-tokens`,
    { name: `mcp-integration-${Date.now()}` },
    { headers: { Authorization: `Bearer ${jwt}` } },
  )
  const item = tokenRes.data.response?.item
  const token = tokenRes.data.response?.token
  if (!token || !item?.id) throw new Error('Failed to create API token')

  createdTokenId = item.id
  createdToken = token
  process.env.TASKVIEW_TOKEN = token
  process.env.__TASKVIEW_LOGIN_JWT__ = jwt
}

export async function teardown() {
  if (!createdTokenId || !createdToken) return
  const jwt = process.env.__TASKVIEW_LOGIN_JWT__
  if (!jwt) return

  await axios
    .delete(`${TASKVIEW_URL}/module/api-tokens`, {
      data: { id: createdTokenId },
      headers: { Authorization: `Bearer ${jwt}` },
    })
    .catch(() => {})
}
