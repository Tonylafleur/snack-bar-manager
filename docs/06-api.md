# API documentée

Base URL : `http://localhost:5321/api`

## Auth

- `POST /auth/login` : connexion.
- `GET /auth/me` : utilisateur courant.

## Dashboard

- `GET /dashboard` : KPI, alertes, derniers mouvements.

## Articles

- `GET /items`
- `POST /items`
- `PUT /items/:id`

## Stock magasin central

- `POST /central/receipt` : entrée fournisseur.
- `POST /transfers` : transfert transactionnel vers standard ou VIP.
- `GET /stocks/:locationCode` : stock par emplacement.
- `GET /movements` : historique filtrable.

## Points de vente

- `POST /outlets/:locationCode/operation` : sale, ration, avary, return, adjustment.
- `GET /outlets/:locationCode/situation`

## Finance

- `POST /finance/entries`
- `GET /finance/summary`

## Clôtures

- `POST /closures`
- `POST /closures/:id/reopen`

## Rapports et sauvegarde

- `GET /reports/daily?date=YYYY-MM-DD`
- `GET /reports/period?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /backup`
- `POST /restore`
