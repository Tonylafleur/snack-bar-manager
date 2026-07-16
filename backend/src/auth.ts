import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { query } from './db.js'

const secret = process.env.JWT_SECRET ?? 'dev-secret'

export type AuthUser = { id: string; username: string; fullName: string; role: string }

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export async function login(username: string, password: string) {
  const { rows } = await query('SELECT id, username, password_hash, full_name, role FROM users WHERE username=$1 AND active=true', [username])
  const user = rows[0]
  if (!user) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  const payload: AuthUser = { id: user.id, username: user.username, fullName: user.full_name, role: user.role }
  return { user: payload, token: jwt.sign(payload, secret, { expiresIn: '12h' }) }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentification requise' })
  try {
    req.user = jwt.verify(header.slice(7), secret) as AuthUser
    next()
  } catch {
    res.status(401).json({ message: 'Session expirée ou invalide' })
  }
}
