#!/usr/bin/env node
import axios from 'axios'
import { TvApi } from 'taskview-api'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from './server.js'

const TASKVIEW_URL = process.env.TASKVIEW_URL
const TASKVIEW_TOKEN = process.env.TASKVIEW_TOKEN

if (!TASKVIEW_URL || !TASKVIEW_TOKEN) {
  console.error('Required environment variables: TASKVIEW_URL, TASKVIEW_TOKEN')
  console.error('Example: TASKVIEW_URL=https://api.taskview.tech TASKVIEW_TOKEN=tvk_...')
  process.exit(1)
}

const $axios = axios.create({
  baseURL: TASKVIEW_URL,
  timeout: 30000,
})
$axios.defaults.headers.common['Authorization'] = `Bearer ${TASKVIEW_TOKEN}`

const api = new TvApi($axios)
const server = createMcpServer(api)
const transport = new StdioServerTransport()

await server.connect(transport)
