import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Archive, BarChart3, Bell, Boxes, CalendarCheck, CheckCircle2, ClipboardList,
  Download, Edit3, FileSpreadsheet, History, LayoutDashboard, Lock, LogOut, Menu, PackagePlus,
  RefreshCcw, Save, Settings, ShieldCheck, ShoppingCart, Store, Trash2, Truck, UserCircle, Users, WalletCards, Wine, X
} from 'lucide-react'
import { api, money, today } from './lib/api'

type Page = 'dashboard' | 'items' | 'central' | 'transfer' | 'movements' | 'standard' | 'vip' | 'finance' | 'closing' | 'reports' | 'settings'
type Item = { id: string; name: string; category_name: string; brand?: string; flavor?: string; volume?: string; package_label: string; base_unit: string; package_equivalence: number; alert_threshold: number; purchase_price_xaf: number; sale_price_standard_xaf: number; sale_price_vip_xaf: number; status: string }
type Category = { id: string; name: string }
type StockRow = { quantity_base: number; location_code: string; location_name: string; item_id: string; name: string; category_name: string; base_unit: string; package_label: string; package_equivalence: number; alert_threshold: number }
type Movement = { id: string; operation_type: string; item_name: string; quantity_base: number; quantity_input: number; unit_input: string; amount_xaf: number; operation_date: string; recorded_at: string; source_name?: string; destination_name?: string; retrospective: boolean; reason?: string }
type SupplierReceipt = Movement & { item_id: string }

type DashboardData = { stocks: { code: string; location: string; quantity: number }[]; alerts: any[]; todaySales: number; expenses: number; losses: any[]; movements: Movement[]; salesTrend: { operation_date: string; standard: number; vip: number }[] }
type CurrentUser = { id: string; username: string; fullName: string; role: string }

const nav: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { page: 'central', label: 'Magasin central', icon: Boxes },
  { page: 'finance', label: 'Recettes & dépenses', icon: WalletCards },
  { page: 'closing', label: 'Clôture', icon: Lock },
  { page: 'reports', label: 'Rapports', icon: FileSpreadsheet },
  { page: 'settings', label: 'Paramètres', icon: Settings }
]

const APP_VERSION = 'V1.1'
const APP_OWNER = 'FelPaTech Solutions'
const SNACK_NAME = 'Diana Plus'
const FORMAT_OPTIONS = [
  ['case12', 'Casier de 12'],
  ['case24', 'Casier de 24'],
  ['pallet6', 'Palette de 6'],
  ['carton24', 'Carton de 24'],
  ['bottle', 'Bouteille']
]

const operationLabels: Record<string, string> = {
  SUPPLIER_IN: 'Entrée fournisseur', TRANSFER_OUT: 'Sortie magasin', TRANSFER_IN: 'Entrée comptoir', SALE: 'Vente', RATION: 'Ration', AVARY: 'Avarie', RETURN: 'Retour', ADJUSTMENT: 'Ajustement', CANCEL: 'Annulation'
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('snack-token'))
  const [page, setPage] = useState<Page>('dashboard')
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const logout = () => { localStorage.removeItem('snack-token'); setToken(null) }

  if (!token) return <Login onLogin={(next) => { localStorage.setItem('snack-token', next); setToken(next) }} />

  const title = nav.find(item => item.page === page)?.label ?? SNACK_NAME
  return <div className="shell">
    <aside className={drawer ? 'open' : ''}>
      <div className="brand"><span><Wine /></span><div><strong>{SNACK_NAME}</strong><small>Snack-bar · XAF</small></div><button className="icon close" onClick={() => setDrawer(false)}><X /></button></div>
      <nav>{nav.map(({ page: target, label, icon: Icon }) => <button key={target} className={page === target ? 'active' : ''} onClick={() => { setPage(target); setDrawer(false) }}><Icon /><span>{label}</span></button>)}</nav>
      <div className="side-meta"><strong>{APP_VERSION}</strong><span>{APP_OWNER}</span></div>
      <button className="logout" onClick={logout}><LogOut /> Déconnexion</button>
    </aside>
    {drawer && <button className="backdrop" onClick={() => setDrawer(false)} />}
    <main>
      <header><button className="icon menu" onClick={() => setDrawer(true)}><Menu /></button><div><small>Gestion professionnelle de stock et finance</small><h1>{title}</h1></div><span className="date">{new Date().toLocaleDateString('fr-CM')}</span></header>
      <section className="page">
        {page === 'dashboard' && <Dashboard notify={notify} />}
        {page === 'items' && <Products notify={notify} />}
        {page === 'central' && <Central notify={notify} />}
        {page === 'transfer' && <Transfer notify={notify} />}
        {page === 'movements' && <Movements />}
        {page === 'standard' && <Outlet code="STANDARD" title="Comptoir standard" notify={notify} />}
        {page === 'vip' && <Outlet code="VIP" title="Comptoir VIP" notify={notify} />}
        {page === 'finance' && <Finance notify={notify} />}
        {page === 'closing' && <Closing notify={notify} />}
        {page === 'reports' && <Reports />}
        {page === 'settings' && <SettingsPage notify={notify} />}
      </section>
    </main>
    {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
  </div>
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('gerant')
  const [password, setPassword] = useState('Gerant123!')
  const [error, setError] = useState('')
  async function submit() {
    try {
      const result = await api<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      onLogin(result.token)
    } catch (e: any) { setError(e.message) }
  }
  return <div className="login"><section><div className="login-mark"><Wine /></div><p className="eyebrow">{SNACK_NAME}</p><h1>Stock, comptoirs et recettes sans confusion.</h1><p>Une interface simple pour contrôler les livraisons, transferts, ventes, rations, avaries, manquants et clôtures.</p></section><form onSubmit={e => { e.preventDefault(); submit() }}><h2>Connexion gérant</h2><label>Identifiant</label><input value={username} onChange={e => setUsername(e.target.value)} /><label>Mot de passe</label><input value={password} type="password" onChange={e => setPassword(e.target.value)} />{error && <p className="error">{error}</p>}<button className="primary">Se connecter</button><small>Démo : gerant / Gerant123!</small></form></div>
}

function Dashboard({ notify }: { notify: (m: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [traceabilityRows, setTraceabilityRows] = useState<Movement[]>([])
  const [movementDate, setMovementDate] = useState('')
  useEffect(() => {
    api<DashboardData>('/dashboard').then(setData).catch(e => notify(e.message))
    api<Movement[]>('/movements').then(setTraceabilityRows).catch(e => notify(e.message))
  }, [])
  if (!data) return <Loading />
  const ration = data.losses.find(x => x.operation_type === 'RATION')?.amount ?? 0
  const avary = data.losses.find(x => x.operation_type === 'AVARY')?.amount ?? 0
  const movementSource = traceabilityRows.length ? traceabilityRows : data.movements
  const movementRows = [...movementSource]
    .filter(row => !movementDate || String(row.operation_date).slice(0, 10) === movementDate)
    .sort((a, b) => `${b.operation_date} ${b.recorded_at}`.localeCompare(`${a.operation_date} ${a.recorded_at}`))
  return <>
    <div className="kpis">
      <Kpi label="Recettes du jour" value={money(data.todaySales)} icon={WalletCards} tone="green" />
      <Kpi label="Dépenses du jour" value={money(data.expenses)} icon={Archive} tone="amber" />
      <Kpi label="Avaries" value={money(avary)} icon={AlertTriangle} tone="red" />
      <Kpi label="Rations" value={money(ration)} icon={ShoppingCart} tone="blue" />
    </div>
    <SalesTrendChart rows={data.salesTrend} />
    <div className="grid two"><section className="panel"><div className="panel-head"><div><p className="eyebrow">Emplacements</p><h2>Stock global</h2></div></div><div className="location-list">{data.stocks.map(row => <article key={row.code}><strong>{row.location}</strong><span>{Number(row.quantity).toLocaleString('fr-CM')} unités</span></article>)}</div></section><section className="panel"><div className="panel-head"><div><p className="eyebrow">Alertes</p><h2>Stocks sous seuil</h2></div><span className="badge danger">{data.alerts.length}</span></div><div className="list">{data.alerts.map((a, i) => <div key={i}><span><strong>{a.name}</strong><small>{a.location}</small></span><b className="negative">{a.quantity_base}</b></div>)}</div>{!data.alerts.length && <Empty text="Aucune alerte stock" />}</section></div>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">Traçabilité</p><h2>Derniers mouvements</h2></div><div className="actions inline table-filters"><input aria-label="Filtrer par date" type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} />{movementDate && <button className="secondary" onClick={() => setMovementDate('')}>Tout afficher</button>}</div></div><MovementTable rows={movementRows} /></section>
  </>
}

function SalesTrendChart({ rows }: { rows: DashboardData['salesTrend'] }) {
  const width = 720
  const height = 260
  const pad = 34
  const max = Math.max(1, ...rows.flatMap(row => [Number(row.standard), Number(row.vip)]))
  const x = (index: number) => pad + (index * (width - pad * 2)) / Math.max(1, rows.length - 1)
  const y = (value: number) => height - pad - (Number(value) / max) * (height - pad * 2)
  const path = (key: 'standard' | 'vip') => rows.map((row, index) => `${index ? 'L' : 'M'}${x(index)},${y(Number(row[key]))}`).join(' ')
  return <section className="panel chart-panel">
    <div className="panel-head"><div><p className="eyebrow">Ventes</p><h2>Tendance journalière par comptoir</h2></div><BarChart3 /></div>
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendance des ventes journalières">
        {[0, .25, .5, .75, 1].map(step => <line key={step} x1={pad} x2={width - pad} y1={pad + step * (height - pad * 2)} y2={pad + step * (height - pad * 2)} className="chart-grid" />)}
        <path d={path('standard')} className="line standard" />
        <path d={path('vip')} className="line vip" />
        {rows.map((row, index) => <g key={row.operation_date}>
          <circle cx={x(index)} cy={y(Number(row.standard))} r="4" className="dot standard" />
          <circle cx={x(index)} cy={y(Number(row.vip))} r="4" className="dot vip" />
          <text x={x(index)} y={height - 8} textAnchor="middle">{new Date(row.operation_date).toLocaleDateString('fr-CM', { day: '2-digit', month: '2-digit' })}</text>
        </g>)}
      </svg>
      <div className="legend"><span><i className="standard" /> Comptoir standard</span><span><i className="vip" /> Comptoir VIP</span></div>
    </div>
  </section>
}

function Products({ notify, refreshKey = 0 }: { notify: (m: string) => void; refreshKey?: number }) {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const emptyItem = { id: '', name: '', categoryId: '', brand: '', flavor: '', volume: '', packageLabel: 'Casier 24', baseUnit: 'bouteille', packageEquivalence: 24, alertThreshold: 12, purchasePrice: 500, salePriceStandard: 1000, salePriceVip: 1500, status: 'ACTIVE' }
  const [form, setForm] = useState<any>(emptyItem)
  const load = () => { api<Item[]>('/items').then(setItems); api<Category[]>('/categories').then(c => { setCategories(c); setForm((f: any) => ({ ...f, categoryId: f.categoryId || c[0]?.id })) }) }
  useEffect(() => { load() }, [refreshKey])
  function create() {
    setForm({ ...emptyItem, categoryId: categories[0]?.id ?? '' })
    setOpen(true)
  }
  function edit(item: Item) {
    setForm({
      id: item.id,
      name: item.name,
      categoryId: categories.find(c => c.name === item.category_name)?.id ?? categories[0]?.id ?? '',
      brand: item.brand ?? '',
      flavor: item.flavor ?? '',
      volume: item.volume ?? '',
      packageLabel: item.package_label,
      baseUnit: item.base_unit,
      packageEquivalence: Number(item.package_equivalence),
      alertThreshold: Number(item.alert_threshold),
      purchasePrice: Number(item.purchase_price_xaf ?? 0),
      salePriceStandard: Number(item.sale_price_standard_xaf ?? 0),
      salePriceVip: Number(item.sale_price_vip_xaf ?? 0),
      status: item.status
    })
    setOpen(true)
  }
  async function save() {
    try {
      const path = form.id ? `/items/${form.id}` : '/items'
      const method = form.id ? 'PUT' : 'POST'
      await api(path, { method, body: JSON.stringify(form) })
      notify(form.id ? 'Produit modifié' : 'Produit créé')
      setOpen(false)
      load()
    } catch (e: any) { notify(e.message) }
  }
  async function disable(item: Item) {
    if (!window.confirm(`Désactiver le produit "${item.name}" ?`)) return
    try {
      await api(`/items/${item.id}`, { method: 'DELETE' })
      notify('Produit désactivé')
      load()
    } catch (e: any) { notify(e.message) }
  }
  return <section className="panel full"><div className="panel-head"><div><p className="eyebrow">Référentiel</p><h2>{items.length} produits</h2></div><button className="primary" onClick={create}><PackagePlus /> Nouveau produit</button></div>{open && <div className="editor"><div className="form-grid"><Field label="Nom" value={form.name} set={v => setForm({ ...form, name: v })} /><Select label="Catégorie" value={form.categoryId} set={v => setForm({ ...form, categoryId: v })} options={categories.map(c => [c.id, c.name])} /><Field label="Marque" value={form.brand} set={v => setForm({ ...form, brand: v })} /><Field label="Saveur" value={form.flavor} set={v => setForm({ ...form, flavor: v })} /><Field label="Volume" value={form.volume} set={v => setForm({ ...form, volume: v })} /><Field label="Conditionnement" value={form.packageLabel} set={v => setForm({ ...form, packageLabel: v })} /><Field label="Unité de base" value={form.baseUnit} set={v => setForm({ ...form, baseUnit: v })} /><Num label="Équivalence" value={form.packageEquivalence} set={v => setForm({ ...form, packageEquivalence: v })} /><Num label="Seuil alerte" value={form.alertThreshold} set={v => setForm({ ...form, alertThreshold: v })} /><Num label="Prix achat" value={form.purchasePrice} set={v => setForm({ ...form, purchasePrice: v })} /><Num label="Prix standard" value={form.salePriceStandard} set={v => setForm({ ...form, salePriceStandard: v })} /><Num label="Prix VIP" value={form.salePriceVip} set={v => setForm({ ...form, salePriceVip: v })} /><Select label="Statut" value={form.status} set={v => setForm({ ...form, status: v })} options={[['ACTIVE', 'Actif'], ['INACTIVE', 'Inactif']]} /></div><div className="actions"><button className="secondary" onClick={() => setOpen(false)}>Annuler</button><button className="primary" onClick={save}><Save /> Enregistrer</button></div></div>}<div className="table-wrap"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Conditionnement</th><th>Base</th><th>Achat</th><th>Standard</th><th>VIP</th><th>Seuil</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{[item.brand, item.flavor, item.volume].filter(Boolean).join(' · ')}</small></td><td>{item.category_name}</td><td>{item.package_label}</td><td>{Math.trunc(Number(item.package_equivalence))} {item.base_unit}</td><td>{money(item.purchase_price_xaf)}</td><td>{money(item.sale_price_standard_xaf)}</td><td>{money(item.sale_price_vip_xaf)}</td><td>{Math.trunc(Number(item.alert_threshold))}</td><td><span className={`badge ${item.status === 'ACTIVE' ? 'success' : 'muted'}`}>{item.status === 'ACTIVE' ? 'Actif' : 'Inactif'}</span></td><td><div className="row-actions"><button className="icon-btn" title="Modifier" onClick={() => edit(item)}><Edit3 /></button><button className="icon-btn danger" title="Désactiver" onClick={() => disable(item)}><Trash2 /></button></div></td></tr>)}</tbody></table></div></section>
}

function Central({ notify }: { notify: (m: string) => void }) {
  const [tab, setTab] = useState<'stock' | 'products' | 'receipt' | 'transfer' | 'movements' | 'employee-ration' | 'standard' | 'vip'>('stock')
  const [stock, setStock] = useState<StockRow[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const load = () => {
    api<StockRow[]>('/stocks/CENTRAL').then(setStock).catch(e => notify(e.message))
    api<Movement[]>('/movements').then(setMovements).catch(e => notify(e.message))
    api<DashboardData>('/dashboard').then(data => setAlerts(data.alerts)).catch(e => notify(e.message))
    api<{ user: CurrentUser }>('/auth/me').then(data => setUser(data.user)).catch(() => undefined)
    setRefreshKey(key => key + 1)
  }
  useEffect(() => { load() }, [])
  async function resetCentralStock() {
    if (!window.confirm('Réinitialiser tout le stock fournisseur à 0 ?')) return
    try {
      const result = await api<{ movements: number }>('/stocks/CENTRAL/reset', { method: 'POST', body: JSON.stringify({}) })
      notify(`Stock fournisseur réinitialisé · ${result.movements} ajustements`)
      load()
    } catch (e: any) { notify(e.message) }
  }
  const total = stock.reduce((sum, row) => sum + Number(row.quantity_base), 0)
  const tabs = [
    ['stock', 'Stock fournisseur', Boxes],
    ['products', 'Produits', Wine],
    ['receipt', 'Entrée fournisseur', PackagePlus],
    ['transfer', 'Transferts', Truck],
    ['movements', 'Mouvements', History],
    ['employee-ration', 'Ration des employes', Users],
    ['standard', 'Point de vente standard', Store],
    ['vip', 'Point de vente VIP', Wine]
  ] as const
  return <>
  <section className="central-nav">
    <div className="central-nav-title">
      <p className="eyebrow">Magasin central</p>
      <h2>Stock, ravitaillement et points de vente</h2>
    </div>
    <div className="central-nav-actions">
      <button className="notify-btn" title="Alertes stock"><Bell /><span>{alerts.length}</span></button>
      <div className="user-chip"><UserCircle /><span>{user?.fullName ?? 'Utilisateur'}</span><small>{user?.role ?? 'GERANT'}</small></div>
      <button className="secondary" onClick={load}><RefreshCcw /> Actualiser</button>
    </div>
    <div className="tabbar nav-tabs">{tabs.map(([key, label, Icon]) => <button key={key} className={`${tab === key ? 'active' : ''} tab-${key}`} onClick={() => setTab(key)}><Icon /> {label}</button>)}</div>
  </section>
    {tab === 'stock' && <section className="panel full stack">
      <div className="kpis compact">
        <Kpi label="Produits suivis" value={String(stock.length)} icon={ClipboardList} tone="blue" />
        <Kpi label="Stock fournisseur" value={`${total.toLocaleString('fr-CM')} unités`} icon={Boxes} tone="green" />
        <Kpi label="Sous seuil" value={String(stock.filter(row => Number(row.quantity_base) <= Number(row.alert_threshold)).length)} icon={AlertTriangle} tone="red" />
      </div>
      <div className="actions inline"><button className="danger-action" onClick={resetCentralStock}><Trash2 /> Réinitialiser le stock fournisseur à 0</button></div>
      <StockTable rows={stock} />
    </section>}
    {tab === 'products' && <Products notify={notify} refreshKey={refreshKey} />}
    {tab === 'receipt' && <SupplierReceipts notify={(m) => { notify(m); load() }} refreshKey={refreshKey} />}
    {tab === 'transfer' && <Transfer notify={(m) => { notify(m); load() }} refreshKey={refreshKey} />}
    {tab === 'movements' && <MovementTable rows={movements} />}
    {tab === 'employee-ration' && <EmployeeRations notify={(m) => { notify(m); load() }} refreshKey={refreshKey} />}
    {tab === 'standard' && <Outlet code="STANDARD" title="Comptoir standard" notify={notify} refreshKey={refreshKey} />}
    {tab === 'vip' && <Outlet code="VIP" title="Comptoir VIP" notify={notify} refreshKey={refreshKey} />}
  </>
}

function SupplierReceipts({ notify, refreshKey = 0 }: { notify: (m: string) => void; refreshKey?: number }) {
  const empty = { id: '', itemId: '', quantity: 1, unit: 'case24', operationDate: today(), supplier: 'Fournisseur' }
  const [items, setItems] = useState<Item[]>([])
  const [receipts, setReceipts] = useState<SupplierReceipt[]>([])
  const [form, setForm] = useState(empty)
  const load = () => {
    api<Item[]>('/items').then(rows => {
      setItems(rows)
      setForm(f => ({ ...f, itemId: f.itemId || rows[0]?.id || '' }))
    })
    api<SupplierReceipt[]>('/central/receipts').then(setReceipts).catch(e => notify(e.message))
  }
  useEffect(() => { load() }, [refreshKey])
  function edit(row: SupplierReceipt) {
    setForm({ id: row.id, itemId: row.item_id, quantity: Number(row.quantity_input), unit: row.unit_input, operationDate: row.operation_date, supplier: row.reason || 'Fournisseur' })
  }
  function reset() {
    setForm({ ...empty, itemId: items[0]?.id || '' })
  }
  async function save() {
    try {
      const payload = { itemId: form.itemId, quantity: form.quantity, unit: form.unit, operationDate: form.operationDate, supplier: form.supplier }
      await api(form.id ? `/central/receipts/${form.id}` : '/central/receipt', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      notify(form.id ? 'Entrée fournisseur modifiée' : 'Entrée fournisseur enregistrée')
      reset()
      load()
    } catch (e: any) { notify(e.message) }
  }
  async function cancel(row: SupplierReceipt) {
    if (!window.confirm(`Annuler l'entrée fournisseur de ${row.item_name} ?`)) return
    try {
      await api(`/central/receipts/${row.id}`, { method: 'DELETE', body: JSON.stringify({ reason: 'Annulation depuis le CRUD fournisseur' }) })
      notify('Entrée fournisseur annulée')
      load()
    } catch (e: any) { notify(e.message) }
  }
  return <section className="panel full">
    <div className="panel-head"><div><p className="eyebrow">Magasin central</p><h2>CRUD entrée fournisseur</h2></div><button className="secondary" onClick={reset}>Nouveau</button></div>
    <div className="editor"><div className="form-grid"><Select label="Produit" value={form.itemId} set={v => setForm({ ...form, itemId: v })} options={items.map(i => [i.id, i.name])} /><Num label="Quantité" value={form.quantity} set={v => setForm({ ...form, quantity: v })} /><Select label="Format" value={form.unit} set={v => setForm({ ...form, unit: v })} options={FORMAT_OPTIONS} /><Field label="Date opération" type="date" value={form.operationDate} set={v => setForm({ ...form, operationDate: v })} /><Field label="Fournisseur / référence" value={form.supplier} set={v => setForm({ ...form, supplier: v })} /></div>{form.operationDate !== today() && <p className="warning"><AlertTriangle /> Saisie rétrospective clairement signalée.</p>}<div className="actions"><button className="secondary" onClick={reset}>Annuler</button><button className="primary" onClick={save}><Save /> {form.id ? 'Modifier' : 'Enregistrer'}</button></div></div>
    <div className="table-wrap"><table><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Format</th><th>Stock ajouté</th><th>Fournisseur</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{receipts.map(row => {
      const canceled = String(row.reason || '').startsWith('[ANNULÉ]')
      return <tr key={row.id}><td>{row.operation_date}</td><td><strong>{row.item_name}</strong></td><td>{Number(row.quantity_input).toLocaleString('fr-CM')}</td><td>{formatLabel(row.unit_input)}</td><td>{Number(row.quantity_base).toLocaleString('fr-CM')}</td><td>{row.reason}</td><td><span className={`badge ${canceled ? 'danger' : 'success'}`}>{canceled ? 'Annulée' : 'Validée'}</span></td><td><div className="row-actions"><button className="icon-btn" title="Modifier" disabled={canceled} onClick={() => edit(row)}><Edit3 /></button><button className="icon-btn danger" title="Annuler" disabled={canceled} onClick={() => cancel(row)}><Trash2 /></button></div></td></tr>
    })}</tbody></table>{!receipts.length && <Empty text="Aucune entrée fournisseur" />}</div>
  </section>
}

function Transfer({ notify, refreshKey = 0 }: { notify: (m: string) => void; refreshKey?: number }) {
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState({ itemId: '', quantity: 1, unit: 'case24', destinationCode: 'STANDARD', operationDate: today(), reason: 'Ravitaillement' })
  useEffect(() => { api<Item[]>('/items').then(rows => { setItems(rows); setForm(f => ({ ...f, itemId: f.itemId || rows[0]?.id || '' })) }) }, [refreshKey])
  async function submit() { try { await api('/transfers', { method: 'POST', body: JSON.stringify(form) }); notify('Transfert validé : sortie magasin et entrée comptoir créées') } catch (e: any) { notify(e.message) } }
  return <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">Magasin central</p><h2>Transfert vers point de vente</h2></div><Truck /></div><Select label="Produit" value={form.itemId} set={v => setForm({ ...form, itemId: v })} options={items.map(i => [i.id, i.name])} /><Num label="Quantité" value={form.quantity} set={v => setForm({ ...form, quantity: v })} /><Select label="Format" value={form.unit} set={v => setForm({ ...form, unit: v })} options={FORMAT_OPTIONS} /><Select label="Destination" value={form.destinationCode} set={v => setForm({ ...form, destinationCode: v })} options={[["STANDARD", "Comptoir standard"], ["VIP", "Comptoir VIP"]]} /><Field label="Date opération" type="date" value={form.operationDate} set={v => setForm({ ...form, operationDate: v })} />{form.operationDate !== today() && <p className="warning"><AlertTriangle /> Saisie rétrospective : la date réelle sera conservée.</p>}<Field label="Motif" value={form.reason} set={v => setForm({ ...form, reason: v })} /><button className="primary wide" onClick={submit}><Save /> Valider le transfert</button></section>
}

function OperationPanel({ title, location, mode, notify }: { title: string; location: string; mode: 'receipt' | 'outlet'; notify: (m: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState<any>({ itemId: '', quantity: 1, unit: 'package', operationDate: today(), supplier: 'Fournisseur', operationType: 'SALE', reason: '' })
  useEffect(() => { api<Item[]>('/items').then(rows => { setItems(rows); setForm((f: any) => ({ ...f, itemId: rows[0]?.id ?? '' })) }) }, [])
  async function submit() {
    try {
      const path = mode === 'receipt' ? '/central/receipt' : `/outlets/${location}/operation`
      await api(path, { method: 'POST', body: JSON.stringify(form) })
      notify('Opération enregistrée')
    } catch (e: any) { notify(e.message) }
  }
  return <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">{location}</p><h2>{title}</h2></div><Save /></div><Select label="Produit" value={form.itemId} set={v => setForm({ ...form, itemId: v })} options={items.map(i => [i.id, i.name])} />{mode === 'outlet' && <Select label="Type de sortie" value={form.operationType} set={v => setForm({ ...form, operationType: v })} options={[["SALE", "Vente"], ["RATION", "Ration"], ["AVARY", "Avarie"], ["RETURN", "Retour"], ["ADJUSTMENT", "Ajustement"]]} />}<Num label="Quantité" value={form.quantity} set={v => setForm({ ...form, quantity: v })} /><Select label="Unité saisie" value={form.unit} set={v => setForm({ ...form, unit: v })} options={[["package", "Conditionnement"], ["base", "Unité de base"]]} /><Field label="Date opération" type="date" value={form.operationDate} set={v => setForm({ ...form, operationDate: v })} />{form.operationDate !== today() && <p className="warning"><AlertTriangle /> Saisie rétrospective clairement signalée.</p>}{mode === 'receipt' ? <Field label="Fournisseur / référence" value={form.supplier} set={v => setForm({ ...form, supplier: v })} /> : <Field label="Motif / observation" value={form.reason} set={v => setForm({ ...form, reason: v })} />}<button className="primary wide" onClick={submit}><Save /> Valider</button></section>
}

function EmployeeRations({ notify, refreshKey = 0 }: { notify: (m: string) => void; refreshKey?: number }) {
  const [form, setForm] = useState({ locationCode: 'CENTRAL', employeeName: '', amount: 0, operationDate: today(), note: 'Nutrition journaliere' })
  useEffect(() => { setForm(f => ({ ...f })) }, [refreshKey])
  async function submit() {
    try {
      const employee = form.employeeName.trim()
      const note = form.note.trim()
      await api('/finance/entries', {
        method: 'POST',
        body: JSON.stringify({
          locationCode: form.locationCode,
          entryType: 'EXPENSE',
          category: 'Ration employes',
          label: [employee ? `Ration journaliere - ${employee}` : 'Ration journaliere', note].filter(Boolean).join(' - '),
          amount: form.amount,
          operationDate: form.operationDate
        })
      })
      notify('Ration employe enregistree en depense')
      setForm(f => ({ ...f, employeeName: '', amount: 0, note: 'Nutrition journaliere' }))
    } catch (e: any) { notify(e.message) }
  }
  return <section className="panel form-panel ration-panel">
    <div className="panel-head"><div><p className="eyebrow">Gestion interne</p><h2>Ration des employes</h2></div><Users /></div>
    <p className="hint">La ration est une depense de nutrition journaliere par employe. Elle alimente les recettes & depenses, le tableau de bord et les rapports financiers.</p>
    <Select label="Emplacement" value={form.locationCode} set={v => setForm({ ...form, locationCode: v })} options={[["CENTRAL", "Magasin central"], ["STANDARD", "Comptoir standard"], ["VIP", "Comptoir VIP"]]} />
    <Field label="Employe" value={form.employeeName} set={v => setForm({ ...form, employeeName: v })} />
    <Num label="Montant journalier XAF" value={form.amount} set={v => setForm({ ...form, amount: v })} />
    <Field label="Date operation" type="date" value={form.operationDate} set={v => setForm({ ...form, operationDate: v })} />
    {form.operationDate !== today() && <p className="warning"><AlertTriangle /> Saisie retrospective clairement signalee.</p>}
    <Field label="Observation" value={form.note} set={v => setForm({ ...form, note: v })} />
    <button className="primary wide" onClick={submit}><Save /> Enregistrer en depense</button>
  </section>
}

function Outlet({ code, title, notify, refreshKey = 0 }: { code: 'STANDARD' | 'VIP'; title: string; notify: (m: string) => void; refreshKey?: number }) {
  const [data, setData] = useState<any>(null)
  const load = () => api(`/outlets/${code}/situation`).then(setData).catch(e => notify(e.message))
  useEffect(() => { load() }, [code, refreshKey])
  return <div className="grid two"><OperationPanel title={`Vente ou sortie - ${title}`} location={code} mode="outlet" notify={(m) => { notify(m); load() }} /><section className="panel"><div className="panel-head"><div><p className="eyebrow">Situation</p><h2>{title}</h2></div><button className="secondary" onClick={load}><RefreshCcw /> Actualiser</button></div>{data ? <><div className="stock-grid">{data.stock.map((s: any) => <article key={s.name}><strong>{s.name}</strong><span>{packageSummary(s)}</span><small>{Number(s.quantity_base).toLocaleString('fr-CM')} {s.base_unit} · {s.package_label}</small></article>)}</div><h3>Derniers mouvements</h3><MovementTable rows={data.movements} /></> : <Loading />}</section></div>
}

function Finance({ notify }: { notify: (m: string) => void }) {
  const [form, setForm] = useState({ locationCode: 'STANDARD', entryType: 'PAYMENT', category: 'Versement', label: '', amount: 0, operationDate: today() })
  async function submit() { try { await api('/finance/entries', { method: 'POST', body: JSON.stringify(form) }); notify('Écriture financière enregistrée') } catch (e: any) { notify(e.message) } }
  return <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">Caisse</p><h2>Recettes et dépenses</h2></div><WalletCards /></div><Select label="Type" value={form.entryType} set={v => setForm({ ...form, entryType: v })} options={[["PAYMENT", "Versement"], ["EXPENSE", "Dépense"], ["LOSS", "Perte"], ["VARIANCE", "Écart"]]} /><Select label="Emplacement" value={form.locationCode} set={v => setForm({ ...form, locationCode: v })} options={[["STANDARD", "Comptoir standard"], ["VIP", "Comptoir VIP"], ["CENTRAL", "Magasin central"]]} /><Field label="Catégorie" value={form.category} set={v => setForm({ ...form, category: v })} /><Field label="Libellé" value={form.label} set={v => setForm({ ...form, label: v })} /><Num label="Montant XAF" value={form.amount} set={v => setForm({ ...form, amount: v })} /><Field label="Date opération" type="date" value={form.operationDate} set={v => setForm({ ...form, operationDate: v })} /><button className="primary wide" onClick={submit}>Enregistrer</button></section>
}

function Closing({ notify }: { notify: (m: string) => void }) {
  const [form, setForm] = useState({ locationCode: 'STANDARD', periodStart: today(), periodEnd: today(), countedAmount: 0, justification: 'Clôture journalière' })
  async function submit() { try { const r = await api<any>('/closures', { method: 'POST', body: JSON.stringify(form) }); notify(`Clôture verrouillée · écart ${money(r.variance_xaf)}`) } catch (e: any) { notify(e.message) } }
  return <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">Verrouillage</p><h2>Inventaire de clôture</h2></div><Lock /></div><Select label="Point de vente" value={form.locationCode} set={v => setForm({ ...form, locationCode: v })} options={[["STANDARD", "Comptoir standard"], ["VIP", "Comptoir VIP"]]} /><Field label="Début période" type="date" value={form.periodStart} set={v => setForm({ ...form, periodStart: v })} /><Field label="Fin période" type="date" value={form.periodEnd} set={v => setForm({ ...form, periodEnd: v })} /><Num label="Montant physique compté" value={form.countedAmount} set={v => setForm({ ...form, countedAmount: v })} /><Field label="Justification" value={form.justification} set={v => setForm({ ...form, justification: v })} /><p className="warning"><ShieldCheck /> La clôture verrouille la période. Toute réouverture devra être justifiée.</p><button className="primary wide" onClick={submit}>Clôturer la période</button></section>
}

function Reports() {
  const [date, setDate] = useState(today())
  const [report, setReport] = useState<any>(null)
  const load = () => api(`/reports/daily?date=${date}`).then(setReport)
  useEffect(() => { load() }, [])
  function exportCsv() {
    if (!report) return
    const rows = [['Date', report.date], ['Comptoir', 'Recettes'], ...report.sales.map((s: any) => [s.code, s.amount]), ['Dépenses', report.expenses]]
    const blob = new Blob([rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `rapport-${date}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }
  return <section className="panel"><div className="panel-head"><div><p className="eyebrow">Exports</p><h2>Rapport journalier et périodique</h2></div><div className="actions inline"><input type="date" value={date} onChange={e => setDate(e.target.value)} /><button className="secondary" onClick={load}>Filtrer</button><button className="primary" onClick={exportCsv}><Download /> CSV</button></div></div>{report ? <div className="report-list"><span>Standard<strong>{money(report.sales.find((s: any) => s.code === 'STANDARD')?.amount)}</strong></span><span>VIP<strong>{money(report.sales.find((s: any) => s.code === 'VIP')?.amount)}</strong></span><span>Dépenses<strong>{money(report.expenses)}</strong></span><span>Net<strong>{money(report.sales.reduce((a: number, s: any) => a + Number(s.amount), 0) - report.expenses)}</strong></span></div> : <Loading />}</section>
}

function Movements() {
  const [rows, setRows] = useState<Movement[]>([])
  useEffect(() => { api<Movement[]>('/movements').then(setRows) }, [])
  return <section className="panel full"><div className="panel-head"><div><p className="eyebrow">Audit stock</p><h2>Historique des mouvements</h2></div></div><MovementTable rows={rows} /></section>
}

function SettingsPage({ notify }: { notify: (m: string) => void }) {
  async function backup() {
    try {
      const token = localStorage.getItem('snack-token')
      const res = await fetch('/api/backup', { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `snack-backup-${today()}.json`; link.click(); URL.revokeObjectURL(link.href)
    } catch (e: any) { notify(e.message) }
  }
  return <section className="panel"><div className="panel-head"><div><p className="eyebrow">Configuration</p><h2>Paramètres généraux</h2></div><Settings /></div><div className="settings-grid"><article><strong>Devise</strong><span>Franc CFA XAF</span></article><article><strong>Emplacements</strong><span>Magasin central, Standard, VIP</span></article><article><strong>Sécurité</strong><span>JWT + audit complet</span></article></div><button className="primary" onClick={backup}><Download /> Télécharger sauvegarde</button></section>
}

function StockTable({ rows }: { rows: StockRow[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Stock fournisseur</th><th>Conditionnement</th><th>Équivalence</th><th>Seuil</th><th>Statut</th></tr></thead><tbody>{rows.map(row => {
    const qty = Number(row.quantity_base)
    const equivalence = Math.trunc(Number(row.package_equivalence))
    const threshold = Math.trunc(Number(row.alert_threshold))
    const isLow = qty <= Number(row.alert_threshold)
    return <tr key={row.item_id}><td><strong>{row.name}</strong></td><td>{row.category_name}</td><td><strong>{qty.toLocaleString('fr-CM')} {row.base_unit}</strong><small>{equivalence ? `${Math.floor(qty / equivalence).toLocaleString('fr-CM')} ${row.package_label}` : ''}</small></td><td>{row.package_label}</td><td>{equivalence} {row.base_unit}</td><td>{threshold}</td><td><span className={`badge ${isLow ? 'danger' : 'success'}`}>{isLow ? 'Alerte' : 'Disponible'}</span></td></tr>
  })}</tbody></table>{!rows.length && <Empty text="Aucun stock fournisseur" />}</div>
}

function MovementTable({ rows }: { rows: Movement[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Date op.</th><th>Saisie</th><th>Type</th><th>Produit</th><th>Origine</th><th>Destination</th><th>Quantité</th><th>Montant</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{String(row.operation_date).slice(0, 10)}</td><td>{new Date(row.recorded_at).toLocaleString('fr-CM')}{row.retrospective && <span className="retro">Rétro</span>}</td><td><strong>{operationLabels[row.operation_type] ?? row.operation_type}</strong></td><td>{row.item_name}</td><td>{row.source_name ?? '-'}</td><td>{row.destination_name ?? '-'}</td><td>{Number(row.quantity_base).toLocaleString('fr-CM')}<small>{row.quantity_input} {row.unit_input}</small></td><td>{money(row.amount_xaf)}</td></tr>)}</tbody></table>{!rows.length && <Empty text="Aucun mouvement" />}</div>
}

function packageSummary(stock: { name: string; quantity_base: number; package_equivalence: number; package_label: string; base_unit: string }) {
  const qty = Math.max(0, Number(stock.quantity_base))
  const equivalence = Math.max(1, Number(stock.package_equivalence || 1))
  const packages = Math.floor(qty / equivalence)
  const remainder = qty % equivalence
  const label = packageUnitLabel(stock.package_label, packages)
  const baseUnit = remainder > 1 ? `${stock.base_unit}s` : stock.base_unit
  const suffix = remainder ? ` + ${remainder.toLocaleString('fr-CM')} ${baseUnit}` : ''
  return `${packages.toLocaleString('fr-CM')} ${label} de ${stock.name}${suffix}`
}

function formatLabel(value: string) {
  return FORMAT_OPTIONS.find(([key]) => key === value)?.[1] ?? (value === 'package' ? 'Conditionnement' : value === 'base' ? 'Bouteille' : value)
}

function packageUnitLabel(packageLabel: string, count: number) {
  const normalized = packageLabel.toLowerCase()
  if (normalized.includes('casier')) return count > 1 ? 'casiers' : 'casier'
  if (normalized.includes('pack')) return count > 1 ? 'packs' : 'pack'
  if (normalized.includes('carton')) return count > 1 ? 'cartons' : 'carton'
  return count > 1 ? 'conditionnements' : 'conditionnement'
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof LayoutDashboard; tone: string }) { return <article className={`kpi ${tone}`}><Icon /><small>{label}</small><strong>{value}</strong></article> }
function Loading() { return <p className="empty">Chargement...</p> }
function Empty({ text }: { text: string }) { return <p className="empty">{text}</p> }
function Field({ label, value, set, type = 'text' }: { label: string; value: string; set: (v: string) => void; type?: string }) { return <div><label>{label}</label><input type={type} value={value ?? ''} onChange={e => set(e.target.value)} /></div> }
function Num({ label, value, set }: { label: string; value: number; set: (v: number) => void }) { return <div><label>{label}</label><input type="number" value={value ?? 0} onChange={e => set(Number(e.target.value))} /></div> }
function Select({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[][] }) { return <div><label>{label}</label><select value={value ?? ''} onChange={e => set(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div> }


