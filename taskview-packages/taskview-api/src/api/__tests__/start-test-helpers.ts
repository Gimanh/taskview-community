import { TvApi } from '@/tv'
import axios from 'axios'
import { expect } from 'vitest'
import { API_URL } from './init-api'
import { noThrow } from './auth-test-helpers'
import type { StartScreenState } from '../start.types'
import type { CollaborationResponseFetchAllUsers } from '../collaboration.types'
import type { TagItem } from '../tags.api.types'
import type { RawGetArgs, RawGetResult, StartListRow, StartSearchRow } from './start-test-helpers.types'

export function clientFor(token: string): TvApi {
  return new TvApi(axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  }))
}

export async function rawGet<T>(args: RawGetArgs): Promise<RawGetResult<T>> {
  const res = await axios.get(`${API_URL}${args.path}`, {
    params: args.params,
    headers: { Authorization: `Bearer ${args.token}` },
    ...noThrow,
  })
  return { status: res.status, body: res.data?.response }
}

export async function fetchState(token: string): Promise<StartScreenState> {
  const res = await rawGet<StartScreenState>({ token, path: '/module/about/fetchallstate', params: { tz: 'UTC' } })
  expect(res.status).toBe(200)
  return res.body!
}

export async function searchTasks(token: string, description: string): Promise<StartSearchRow[]> {
  const res = await rawGet<StartSearchRow[]>({ token, path: '/module/about/search-task', params: { description } })
  expect(res.status).toBe(200)
  return res.body!
}

export async function fetchLists(token: string): Promise<StartListRow[]> {
  const res = await rawGet<StartListRow[]>({ token, path: '/module/about/fetch/lists' })
  expect(res.status).toBe(200)
  return res.body!
}

export async function fetchCollaborators(token: string): Promise<CollaborationResponseFetchAllUsers[]> {
  const res = await rawGet<CollaborationResponseFetchAllUsers[]>({ token, path: '/module/collaboration' })
  expect(res.status).toBe(200)
  return res.body!
}

export async function fetchTags(token: string): Promise<TagItem[]> {
  const res = await rawGet<TagItem[]>({ token, path: '/module/tags' })
  expect(res.status).toBe(200)
  return res.body!
}

export function stateTaskIds(state: StartScreenState): number[] {
  return [...state.tasks, ...state.tasksToday, ...state.tasksUpcoming, ...state.tasksLastCompleted].map((t) => t.id)
}
