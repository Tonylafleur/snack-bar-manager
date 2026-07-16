export const openapi = {
  openapi: '3.0.0',
  info: { title: 'Snack-Bar Manager API', version: '0.1.0' },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/login': { post: { summary: 'Connexion du gérant' } },
    '/dashboard': { get: { summary: 'KPI stock et finance' } },
    '/items': { get: { summary: 'Liste articles' }, post: { summary: 'Créer article' } },
    '/central/receipt': { post: { summary: 'Entrée fournisseur au magasin central' } },
    '/transfers': { post: { summary: 'Transfert transactionnel central vers comptoir' } },
    '/stocks/{locationCode}': { get: { summary: 'Stock par emplacement' } },
    '/movements': { get: { summary: 'Journal des mouvements' } },
    '/outlets/{locationCode}/operation': { post: { summary: 'Vente, ration, avarie, retour ou ajustement' } },
    '/finance/entries': { post: { summary: 'Versement ou dépense' } },
    '/closures': { post: { summary: 'Clôture de période' } },
    '/reports/daily': { get: { summary: 'Rapport journalier' } },
    '/backup': { get: { summary: 'Sauvegarde JSON' } }
  }
}
