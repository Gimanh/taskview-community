import { Client } from 'pg'
import { DB_CREDENTIALS } from './db-credentials'

/** A direct connection to the test stack database, for state the API never exposes (e.g. emailed codes). */
export async function openTestDb(): Promise<Client> {
  const client = new Client({
    host: DB_CREDENTIALS.DB_HOST || 'localhost',
    port: parseInt(DB_CREDENTIALS.DB_PORT || '15432', 10),
    database: DB_CREDENTIALS.DB_NAME || 'taskviewdb',
    user: DB_CREDENTIALS.DB_USER || 'tvdbuser',
    password: DB_CREDENTIALS.DB_PASSWORD || 'tvdbpass',
  })
  await client.connect()
  return client
}
