import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { query, transaction } from './db.js'
import { login, requireAuth } from './auth.js'
import { openapi } from './openapi.js'

const app = express()
const port = Number(process.env.PORT ?? 5321)
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '8mb' }))

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next)
const today = () => new Date().toISOString().slice(0, 10)
const isRetrospective = (operationDate: string) => operationDate !== today()

async function audit(action: string, entity: string, entityId: string | null, actorId: string | undefined, details: any = {}) {
  await query('INSERT INTO audit_logs(action, entity, entity_id, actor_id, details) VALUES ($1,$2,$3,$4,$5)', [action, entity, entityId, actorId ?? null, details])
}

async function getLocation(code: string, client?: any) {
  const q = client ? client.query.bind(client) : query
  const { rows } = await q('SELECT * FROM locations WHERE code=$1 AND active=true', [code])
  if (!rows[0]) throw Object.assign(new Error('Emplacement introuvable'), { status: 404 })
  return rows[0]
}

async function getItem(itemId: string, client?: any) {
  const q = client ? client.query.bind(client) : query
  const { rows } = await q('SELECT * FROM items WHERE id=$1 AND status=$2', [itemId, 'ACTIVE'])
  if (!rows[0]) throw Object.assign(new Error('Article introuvable'), { status: 404 })
  return rows[0]
}

async function currentPrice(itemId: string, client?: any) {
  const q = client ? client.query.bind(client) : query
  const { rows } = await q('SELECT * FROM item_prices WHERE item_id=$1 AND valid_to IS NULL ORDER BY valid_from DESC LIMIT 1', [itemId])
  return rows[0]
}

const quantityUnitSchema = z.enum(['base','package','case12','case24','pallet6','carton24','bottle'])
type QuantityUnit = z.infer<typeof quantityUnitSchema>

function convertQuantity(quantity: number, unit: QuantityUnit, equivalence: number) {
  if (unit === 'package') return quantity * equivalence
  if (unit === 'case12') return quantity * 12
  if (unit === 'case24') return quantity * 24
  if (unit === 'pallet6') return quantity * equivalence * 6
  if (unit === 'carton24') return quantity * 24
  return quantity
}

async function ensureStock(client: any, itemId: string, locationId: string) {
  await client.query('INSERT INTO stocks(item_id, location_id, quantity_base) VALUES($1,$2,0) ON CONFLICT(item_id, location_id) DO NOTHING', [itemId, locationId])
}

async function updateStock(client: any, itemId: string, locationId: string, delta: number) {
  await ensureStock(client, itemId, locationId)
  const { rows } = await client.query('UPDATE stocks SET quantity_base = quantity_base + $1, updated_at=now() WHERE item_id=$2 AND location_id=$3 RETURNING quantity_base', [delta, itemId, locationId])
  if (Number(rows[0].quantity_base) < -0.0001) throw Object.assign(new Error('Stock disponible insuffisant'), { status: 409 })
  return Number(rows[0].quantity_base)
}

async function stockLevel(client: any, itemId: string, locationId: string) {
  await ensureStock(client, itemId, locationId)
  const { rows } = await client.query('SELECT quantity_base FROM stocks WHERE item_id=$1 AND location_id=$2', [itemId, locationId])
  return Number(rows[0].quantity_base)
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'snack-manager-api' }))
app.get('/api/openapi.json', (_req, res) => res.json(openapi))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const body = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body)
  const result = await login(body.username, body.password)
  if (!result) return res.status(401).json({ message: 'Identifiants incorrects' })
  await audit('LOGIN', 'users', result.user.id, result.user.id)
  res.json(result)
}))

app.use('/api', requireAuth)

app.get('/api/auth/me', (req, res) => res.json({ user: req.user }))

app.get('/api/items', asyncHandler(async (_req, res) => {
  const { rows } = await query(`
    SELECT i.*, c.name category_name, p.purchase_price_xaf, p.sale_price_standard_xaf, p.sale_price_vip_xaf
    FROM items i
    LEFT JOIN categories c ON c.id=i.category_id
    LEFT JOIN LATERAL (SELECT * FROM item_prices p WHERE p.item_id=i.id AND p.valid_to IS NULL ORDER BY valid_from DESC LIMIT 1) p ON true
    ORDER BY c.name, i.name`)
  res.json(rows)
}))

app.get('/api/categories', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories WHERE active=true ORDER BY name')
  res.json(rows)
}))

app.post('/api/items', asyncHandler(async (req, res) => {
  const body = z.object({
    categoryId: z.string().uuid(), name: z.string().min(2), brand: z.string().optional().nullable(), flavor: z.string().optional().nullable(), volume: z.string().optional().nullable(),
    packageLabel: z.string().min(1), baseUnit: z.string().min(1), packageEquivalence: z.number().positive(), alertThreshold: z.number().nonnegative(),
    purchasePrice: z.number().nonnegative(), salePriceStandard: z.number().nonnegative(), salePriceVip: z.number().nonnegative()
  }).parse(req.body)
  const item = await transaction(async client => {
    const { rows } = await client.query(`INSERT INTO items(category_id,name,brand,flavor,volume,package_label,base_unit,package_equivalence,alert_threshold)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [body.categoryId, body.name, body.brand, body.flavor, body.volume, body.packageLabel, body.baseUnit, body.packageEquivalence, body.alertThreshold])
    await client.query('INSERT INTO item_prices(item_id,purchase_price_xaf,sale_price_standard_xaf,sale_price_vip_xaf) VALUES($1,$2,$3,$4)', [rows[0].id, body.purchasePrice, body.salePriceStandard, body.salePriceVip])
    const locs = await client.query('SELECT id FROM locations')
    for (const loc of locs.rows) await ensureStock(client, rows[0].id, loc.id)
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['CREATE', 'items', rows[0].id, req.user?.id, body])
    return rows[0]
  })
  res.status(201).json(item)
}))

app.put('/api/items/:id', asyncHandler(async (req, res) => {
  const body = z.object({
    categoryId: z.string().uuid().optional(), name: z.string().min(2), brand: z.string().optional().nullable(), flavor: z.string().optional().nullable(), volume: z.string().optional().nullable(),
    packageLabel: z.string().min(1), baseUnit: z.string().min(1), packageEquivalence: z.number().positive(), alertThreshold: z.number().nonnegative(), status: z.enum(['ACTIVE','INACTIVE']),
    purchasePrice: z.number().nonnegative(), salePriceStandard: z.number().nonnegative(), salePriceVip: z.number().nonnegative()
  }).parse(req.body)
  const item = await transaction(async client => {
    const current = await client.query('SELECT category_id FROM items WHERE id=$1', [req.params.id])
    if (!current.rows[0]) throw Object.assign(new Error('Article introuvable'), { status: 404 })
    const categoryId = body.categoryId ?? current.rows[0].category_id
    const { rows } = await client.query(`UPDATE items SET category_id=$1,name=$2,brand=$3,flavor=$4,volume=$5,package_label=$6,base_unit=$7,package_equivalence=$8,alert_threshold=$9,status=$10 WHERE id=$11 RETURNING *`, [categoryId, body.name, body.brand, body.flavor, body.volume, body.packageLabel, body.baseUnit, body.packageEquivalence, body.alertThreshold, body.status, req.params.id])
    await client.query('UPDATE item_prices SET valid_to=now() WHERE item_id=$1 AND valid_to IS NULL', [req.params.id])
    await client.query('INSERT INTO item_prices(item_id,purchase_price_xaf,sale_price_standard_xaf,sale_price_vip_xaf) VALUES($1,$2,$3,$4)', [req.params.id, body.purchasePrice, body.salePriceStandard, body.salePriceVip])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['UPDATE', 'items', req.params.id, req.user?.id, body])
    return rows[0]
  })
  res.json(item)
}))

app.delete('/api/items/:id', asyncHandler(async (req, res) => {
  const { rows } = await query('UPDATE items SET status=$1 WHERE id=$2 RETURNING *', ['INACTIVE', req.params.id])
  if (!rows[0]) return res.status(404).json({ message: 'Article introuvable' })
  await audit('DISABLE_ITEM', 'items', req.params.id, req.user?.id, { reason: 'Désactivation depuis le référentiel' })
  res.json(rows[0])
}))

app.get('/api/stocks/:locationCode', asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT s.quantity_base, l.code location_code, l.name location_name, i.id item_id, i.name, i.brand, i.flavor, i.volume, i.package_label, i.base_unit, i.package_equivalence, i.alert_threshold, c.name category_name
    FROM stocks s JOIN locations l ON l.id=s.location_id JOIN items i ON i.id=s.item_id LEFT JOIN categories c ON c.id=i.category_id
    WHERE l.code=$1 ORDER BY c.name, i.name`, [req.params.locationCode.toUpperCase()])
  res.json(rows)
}))

app.get('/api/dashboard', asyncHandler(async (_req, res) => {
  const stocks = await query(`SELECT l.code, l.name location, SUM(s.quantity_base) quantity FROM stocks s JOIN locations l ON l.id=s.location_id GROUP BY l.code,l.name ORDER BY l.code`)
  const alerts = await query(`SELECT i.name, l.name location, s.quantity_base, i.alert_threshold FROM stocks s JOIN items i ON i.id=s.item_id JOIN locations l ON l.id=s.location_id WHERE s.quantity_base <= i.alert_threshold AND i.status='ACTIVE' ORDER BY s.quantity_base ASC LIMIT 12`)
  const todaySales = await query(`SELECT COALESCE(SUM(amount_xaf),0) amount FROM stock_movements WHERE operation_type='SALE' AND operation_date=$1`, [new Date().toISOString().slice(0,10)])
  const expenses = await query(`SELECT COALESCE(SUM(amount_xaf),0) amount FROM finance_entries WHERE entry_type='EXPENSE' AND operation_date=$1`, [new Date().toISOString().slice(0,10)])
  const losses = await query(`SELECT operation_type, COALESCE(SUM(amount_xaf),0) amount FROM stock_movements WHERE operation_type IN ('RATION','AVARY') AND operation_date=$1 GROUP BY operation_type`, [new Date().toISOString().slice(0,10)])
  const movements = await query(`SELECT m.*, i.name item_name, sl.name source_name, dl.name destination_name FROM stock_movements m JOIN items i ON i.id=m.item_id LEFT JOIN locations sl ON sl.id=m.source_location_id LEFT JOIN locations dl ON dl.id=m.destination_location_id ORDER BY m.recorded_at DESC LIMIT 10`)
  const salesTrend = await query(`
    WITH days AS (
      SELECT generate_series((CURRENT_DATE - INTERVAL '6 days')::date, CURRENT_DATE, INTERVAL '1 day')::date AS operation_date
    )
    SELECT d.operation_date,
      COALESCE(SUM(m.amount_xaf) FILTER (WHERE l.code='STANDARD'),0) standard,
      COALESCE(SUM(m.amount_xaf) FILTER (WHERE l.code='VIP'),0) vip
    FROM days d
    LEFT JOIN stock_movements m ON m.operation_date=d.operation_date AND m.operation_type='SALE'
    LEFT JOIN locations l ON l.id=m.source_location_id
    GROUP BY d.operation_date
    ORDER BY d.operation_date`)
  res.json({ stocks: stocks.rows, alerts: alerts.rows, todaySales: Number(todaySales.rows[0].amount), expenses: Number(expenses.rows[0].amount), losses: losses.rows, movements: movements.rows, salesTrend: salesTrend.rows })
}))

app.post('/api/stocks/CENTRAL/reset', asyncHandler(async (req, res) => {
  const result = await transaction(async client => {
    const central = await getLocation('CENTRAL', client)
    const stock = await client.query(`SELECT s.*, i.name item_name FROM stocks s JOIN items i ON i.id=s.item_id WHERE s.location_id=$1 AND s.quantity_base <> 0`, [central.id])
    const movements: any[] = []
    for (const row of stock.rows) {
      const qty = Number(row.quantity_base)
      const price = await currentPrice(row.item_id, client)
      const unitPrice = Number(price?.purchase_price_xaf ?? 0)
      const delta = -qty
      const movement = await client.query(`INSERT INTO stock_movements(operation_type,item_id,source_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
        VALUES('ADJUSTMENT',$1,$2,$3,'base',$4,$5,$6,$7,false,$8,$9) RETURNING *`, [row.item_id, central.id, Math.abs(qty), delta, unitPrice, delta * unitPrice, today(), 'Réinitialisation du stock fournisseur à zéro', req.user?.id])
      movements.push(movement.rows[0])
    }
    await client.query('UPDATE stocks SET quantity_base=0, updated_at=now() WHERE location_id=$1', [central.id])
    await client.query('INSERT INTO audit_logs(action,entity,actor_id,details) VALUES($1,$2,$3,$4)', ['RESET_CENTRAL_STOCK', 'stocks', req.user?.id, { location: 'CENTRAL', movements: movements.length }])
    return { reset: true, movements: movements.length }
  })
  res.json(result)
}))

app.get('/api/central/receipts', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT m.*, i.name item_name
    FROM stock_movements m
    JOIN items i ON i.id=m.item_id
    WHERE m.operation_type='SUPPLIER_IN'
    ORDER BY m.recorded_at DESC
    LIMIT 100`)
  res.json(rows)
}))

app.post('/api/central/receipt', asyncHandler(async (req, res) => {
  const body = z.object({ itemId: z.string().uuid(), quantity: z.number().positive(), unit: quantityUnitSchema, operationDate: z.string().date(), supplier: z.string().optional().default('Fournisseur') }).parse(req.body)
  const result = await transaction(async client => {
    const central = await getLocation('CENTRAL', client)
    const item = await getItem(body.itemId, client)
    const price = await currentPrice(item.id, client)
    const qtyBase = convertQuantity(body.quantity, body.unit, Number(item.package_equivalence))
    await updateStock(client, item.id, central.id, qtyBase)
    const { rows } = await client.query(`INSERT INTO stock_movements(operation_type,item_id,destination_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
      VALUES('SUPPLIER_IN',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [item.id, central.id, body.quantity, body.unit, qtyBase, price?.purchase_price_xaf ?? 0, qtyBase * Number(price?.purchase_price_xaf ?? 0), body.operationDate, isRetrospective(body.operationDate), body.supplier, req.user?.id])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['VALIDATE_SUPPLIER_IN', 'stock_movements', rows[0].id, req.user?.id, body])
    return rows[0]
  })
  res.status(201).json(result)
}))

app.put('/api/central/receipts/:id', asyncHandler(async (req, res) => {
  const body = z.object({ itemId: z.string().uuid(), quantity: z.number().positive(), unit: quantityUnitSchema, operationDate: z.string().date(), supplier: z.string().optional().default('Fournisseur') }).parse(req.body)
  const result = await transaction(async client => {
    const current = await client.query(`SELECT * FROM stock_movements WHERE id=$1 AND operation_type='SUPPLIER_IN'`, [req.params.id])
    if (!current.rows[0]) throw Object.assign(new Error('Entrée fournisseur introuvable'), { status: 404 })
    if (String(current.rows[0].reason ?? '').startsWith('[ANNULÉ]')) throw Object.assign(new Error('Entrée fournisseur déjà annulée'), { status: 409 })
    const central = await getLocation('CENTRAL', client)
    const oldMovement = current.rows[0]
    const oldItem = await getItem(oldMovement.item_id, client)
    const item = await getItem(body.itemId, client)
    const price = await currentPrice(item.id, client)
    const newQtyBase = convertQuantity(body.quantity, body.unit, Number(item.package_equivalence))
    if (oldMovement.item_id === body.itemId) {
      await updateStock(client, item.id, central.id, newQtyBase - Number(oldMovement.quantity_base))
    } else {
      await updateStock(client, oldItem.id, central.id, -Number(oldMovement.quantity_base))
      await updateStock(client, item.id, central.id, newQtyBase)
    }
    const { rows } = await client.query(`UPDATE stock_movements SET item_id=$1, quantity_input=$2, unit_input=$3, quantity_base=$4, unit_price_xaf=$5, amount_xaf=$6, operation_date=$7, retrospective=$8, reason=$9
      WHERE id=$10 RETURNING *`, [item.id, body.quantity, body.unit, newQtyBase, price?.purchase_price_xaf ?? 0, newQtyBase * Number(price?.purchase_price_xaf ?? 0), body.operationDate, isRetrospective(body.operationDate), body.supplier, req.params.id])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['UPDATE_SUPPLIER_IN', 'stock_movements', req.params.id, req.user?.id, { before: oldMovement, after: body }])
    return rows[0]
  })
  res.json(result)
}))

app.delete('/api/central/receipts/:id', asyncHandler(async (req, res) => {
  const body = z.object({ reason: z.string().min(3).optional().default('Annulation entrée fournisseur') }).parse(req.body ?? {})
  const result = await transaction(async client => {
    const current = await client.query(`SELECT * FROM stock_movements WHERE id=$1 AND operation_type='SUPPLIER_IN'`, [req.params.id])
    if (!current.rows[0]) throw Object.assign(new Error('Entrée fournisseur introuvable'), { status: 404 })
    const movement = current.rows[0]
    if (String(movement.reason ?? '').startsWith('[ANNULÉ]')) throw Object.assign(new Error('Entrée fournisseur déjà annulée'), { status: 409 })
    const central = await getLocation('CENTRAL', client)
    const item = await getItem(movement.item_id, client)
    await updateStock(client, item.id, central.id, -Number(movement.quantity_base))
    await client.query(`UPDATE stock_movements SET reason=$1 WHERE id=$2`, [`[ANNULÉ] ${movement.reason ?? ''}`.trim(), req.params.id])
    const { rows } = await client.query(`INSERT INTO stock_movements(operation_type,item_id,source_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
      VALUES('CANCEL',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [item.id, central.id, Number(movement.quantity_input), movement.unit_input, -Number(movement.quantity_base), Number(movement.unit_price_xaf ?? 0), -Number(movement.amount_xaf ?? 0), movement.operation_date, isRetrospective(movement.operation_date), `${body.reason} #${req.params.id}`, req.user?.id])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['CANCEL_SUPPLIER_IN', 'stock_movements', req.params.id, req.user?.id, { reason: body.reason }])
    return rows[0]
  })
  res.json(result)
}))

app.post('/api/transfers', asyncHandler(async (req, res) => {
  const body = z.object({ itemId: z.string().uuid(), quantity: z.number().positive(), unit: quantityUnitSchema, destinationCode: z.enum(['STANDARD','VIP']), operationDate: z.string().date(), reason: z.string().optional().default('Ravitaillement') }).parse(req.body)
  const result = await transaction(async client => {
    const central = await getLocation('CENTRAL', client)
    const destination = await getLocation(body.destinationCode, client)
    const item = await getItem(body.itemId, client)
    const price = await currentPrice(item.id, client)
    const qtyBase = convertQuantity(body.quantity, body.unit, Number(item.package_equivalence))
    const available = await stockLevel(client, item.id, central.id)
    if (available < qtyBase) throw Object.assign(new Error(`Stock central insuffisant. Disponible: ${available}`), { status: 409 })
    const groupId = crypto.randomUUID()
    await updateStock(client, item.id, central.id, -qtyBase)
    await updateStock(client, item.id, destination.id, qtyBase)
    const out = await client.query(`INSERT INTO stock_movements(transfer_group_id,operation_type,item_id,source_location_id,destination_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
      VALUES($1,'TRANSFER_OUT',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [groupId, item.id, central.id, destination.id, body.quantity, body.unit, -qtyBase, price?.purchase_price_xaf ?? 0, -qtyBase * Number(price?.purchase_price_xaf ?? 0), body.operationDate, isRetrospective(body.operationDate), body.reason, req.user?.id])
    await client.query(`INSERT INTO stock_movements(transfer_group_id,operation_type,item_id,source_location_id,destination_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
      VALUES($1,'TRANSFER_IN',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [groupId, item.id, central.id, destination.id, body.quantity, body.unit, qtyBase, price?.purchase_price_xaf ?? 0, qtyBase * Number(price?.purchase_price_xaf ?? 0), body.operationDate, isRetrospective(body.operationDate), body.reason, req.user?.id])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', ['VALIDATE_TRANSFER', 'stock_movements', out.rows[0].id, req.user?.id, body])
    return { transferGroupId: groupId, movement: out.rows[0] }
  })
  res.status(201).json(result)
}))

app.post('/api/outlets/:locationCode/operation', asyncHandler(async (req, res) => {
  const body = z.object({ itemId: z.string().uuid(), quantity: z.number().positive(), unit: quantityUnitSchema, operationType: z.enum(['SALE','RATION','AVARY','RETURN','ADJUSTMENT']), operationDate: z.string().date(), reason: z.string().optional().default('') }).parse(req.body)
  const result = await transaction(async client => {
    const location = await getLocation(req.params.locationCode.toUpperCase(), client)
    if (location.type !== 'OUTLET') throw Object.assign(new Error('Opération réservée aux comptoirs'), { status: 400 })
    const item = await getItem(body.itemId, client)
    const price = await currentPrice(item.id, client)
    const qtyBaseRaw = convertQuantity(body.quantity, body.unit, Number(item.package_equivalence))
    const decreases = ['SALE','RATION','AVARY'].includes(body.operationType)
    const qtyBase = decreases ? -qtyBaseRaw : qtyBaseRaw
    if (decreases) {
      const available = await stockLevel(client, item.id, location.id)
      if (available < qtyBaseRaw) throw Object.assign(new Error(`Stock ${location.name} insuffisant. Disponible: ${available}`), { status: 409 })
    }
    await updateStock(client, item.id, location.id, qtyBase)
    const salePrice = location.code === 'VIP' ? Number(price?.sale_price_vip_xaf ?? 0) : Number(price?.sale_price_standard_xaf ?? 0)
    const unitPrice = body.operationType === 'SALE' ? salePrice : Number(price?.purchase_price_xaf ?? 0)
    const amount = body.operationType === 'SALE' ? qtyBaseRaw * salePrice : qtyBaseRaw * unitPrice
    const { rows } = await client.query(`INSERT INTO stock_movements(operation_type,item_id,source_location_id,quantity_input,unit_input,quantity_base,unit_price_xaf,amount_xaf,operation_date,retrospective,reason,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [body.operationType, item.id, location.id, body.quantity, body.unit, qtyBase, unitPrice, amount, body.operationDate, isRetrospective(body.operationDate), body.reason, req.user?.id])
    await client.query('INSERT INTO audit_logs(action,entity,entity_id,actor_id,details) VALUES($1,$2,$3,$4,$5)', [`VALIDATE_${body.operationType}`, 'stock_movements', rows[0].id, req.user?.id, body])
    return rows[0]
  })
  res.status(201).json(result)
}))

app.get('/api/outlets/:locationCode/situation', asyncHandler(async (req, res) => {
  const code = req.params.locationCode.toUpperCase()
  const stock = await query(`SELECT s.quantity_base, i.name, i.base_unit, i.package_label, i.package_equivalence, i.alert_threshold FROM stocks s JOIN locations l ON l.id=s.location_id JOIN items i ON i.id=s.item_id WHERE l.code=$1 ORDER BY i.name`, [code])
  const movements = await query(`SELECT m.*, i.name item_name FROM stock_movements m JOIN items i ON i.id=m.item_id LEFT JOIN locations l ON l.id=COALESCE(m.destination_location_id,m.source_location_id) WHERE l.code=$1 ORDER BY m.recorded_at DESC LIMIT 30`, [code])
  res.json({ stock: stock.rows, movements: movements.rows })
}))

app.get('/api/movements', asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT m.*, i.name item_name, sl.name source_name, dl.name destination_name, u.full_name created_by_name
    FROM stock_movements m JOIN items i ON i.id=m.item_id LEFT JOIN locations sl ON sl.id=m.source_location_id LEFT JOIN locations dl ON dl.id=m.destination_location_id LEFT JOIN users u ON u.id=m.created_by
    ORDER BY m.recorded_at DESC LIMIT 200`)
  res.json(rows)
}))

app.post('/api/finance/entries', asyncHandler(async (req, res) => {
  const body = z.object({ locationCode: z.enum(['CENTRAL','STANDARD','VIP']).optional(), entryType: z.enum(['PAYMENT','EXPENSE','LOSS','VARIANCE']), category: z.string().min(2), label: z.string().min(2), amount: z.number(), operationDate: z.string().date() }).parse(req.body)
  const location = body.locationCode ? await getLocation(body.locationCode) : null
  const { rows } = await query('INSERT INTO finance_entries(location_id,entry_type,category,label,amount_xaf,operation_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [location?.id ?? null, body.entryType, body.category, body.label, body.amount, body.operationDate, req.user?.id])
  await audit('CREATE_FINANCE_ENTRY', 'finance_entries', rows[0].id, req.user?.id, body)
  res.status(201).json(rows[0])
}))

app.get('/api/finance/summary', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT entry_type, category, COALESCE(SUM(amount_xaf),0) amount FROM finance_entries GROUP BY entry_type, category ORDER BY entry_type, category`)
  res.json(rows)
}))

app.post('/api/closures', asyncHandler(async (req, res) => {
  const body = z.object({ locationCode: z.enum(['STANDARD','VIP']), periodStart: z.string().date(), periodEnd: z.string().date(), countedAmount: z.number(), justification: z.string().optional().default('Clôture validée') }).parse(req.body)
  const location = await getLocation(body.locationCode)
  const sales = await query(`SELECT COALESCE(SUM(amount_xaf),0) amount FROM stock_movements WHERE operation_type='SALE' AND source_location_id=$1 AND operation_date BETWEEN $2 AND $3`, [location.id, body.periodStart, body.periodEnd])
  const expenses = await query(`SELECT COALESCE(SUM(amount_xaf),0) amount FROM finance_entries WHERE entry_type='EXPENSE' AND (location_id=$1 OR location_id IS NULL) AND operation_date BETWEEN $2 AND $3`, [location.id, body.periodStart, body.periodEnd])
  const theoretical = Number(sales.rows[0].amount) - Number(expenses.rows[0].amount)
  const variance = body.countedAmount - theoretical
  const { rows } = await query('INSERT INTO closures(location_id,period_start,period_end,theoretical_amount_xaf,counted_amount_xaf,variance_xaf,justification,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [location.id, body.periodStart, body.periodEnd, theoretical, body.countedAmount, variance, body.justification, req.user?.id])
  await audit('LOCK_CLOSURE', 'closures', rows[0].id, req.user?.id, body)
  res.status(201).json(rows[0])
}))

app.get('/api/reports/daily', asyncHandler(async (req, res) => {
  const date = String(req.query.date ?? today())
  const sales = await query(`SELECT l.code, COALESCE(SUM(m.amount_xaf),0) amount FROM locations l LEFT JOIN stock_movements m ON m.source_location_id=l.id AND m.operation_type='SALE' AND m.operation_date=$1 WHERE l.type='OUTLET' GROUP BY l.code ORDER BY l.code`, [date])
  const outputs = await query(`SELECT operation_type, COALESCE(SUM(amount_xaf),0) amount FROM stock_movements WHERE operation_date=$1 AND operation_type IN ('RATION','AVARY') GROUP BY operation_type`, [date])
  const expenses = await query(`SELECT COALESCE(SUM(amount_xaf),0) amount FROM finance_entries WHERE entry_type='EXPENSE' AND operation_date=$1`, [date])
  res.json({ date, sales: sales.rows, outputs: outputs.rows, expenses: Number(expenses.rows[0].amount) })
}))

app.get('/api/backup', asyncHandler(async (_req, res) => {
  const tables = ['categories','locations','items','item_prices','stocks','stock_movements','finance_entries','closures','audit_logs']
  const backup: Record<string, any[]> = {}
  for (const table of tables) backup[table] = (await query(`SELECT * FROM ${table}`)).rows
  res.setHeader('Content-Disposition', `attachment; filename="snack-backup-${today()}.json"`)
  res.json({ exportedAt: new Date().toISOString(), backup })
}))

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.issues) return res.status(400).json({ message: 'Données invalides', issues: err.issues })
  res.status(err.status ?? 500).json({ message: err.message ?? 'Erreur serveur' })
})

app.listen(port, () => console.log(`Snack Manager API running on ${port}`))
