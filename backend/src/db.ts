import pg from 'pg'

const { Pool } = pg
const connectionString = process.env.DATABASE_URL ?? 'postgres://snack:snackpass@localhost:5438/snack_manager'
const requiresSsl = connectionString.includes('sslmode=require') || (process.env.VERCEL === '1' && !connectionString.includes('localhost'))

export const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined
})

export async function query(text: string, params: any[] = []) {
  return pool.query(text, params)
}

export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
