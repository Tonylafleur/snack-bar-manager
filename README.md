# Snack-Bar Manager

Application web professionnelle de gestion de stock et suivi financier pour un snack-bar avec magasin central, comptoir standard et comptoir VIP.

## Démarrage rapide

```powershell
cd D:\snack-bar-manager
docker compose up --build -d
```

Accès :

- Frontend : http://localhost:5320
- API : http://localhost:5321/api/health
- Swagger JSON : http://localhost:5321/api/openapi.json
- PostgreSQL : localhost:5438

Compte de démonstration :

- utilisateur : `gerant`
- mot de passe : `Gerant123!`

## Modules inclus

- authentification du gérant ;
- tableau de bord stock/finance ;
- référentiel articles avec conditionnements et prix standard/VIP ;
- entrées fournisseur au magasin central ;
- transferts transactionnels vers comptoir standard ou VIP ;
- situations des points de vente ;
- ventes, rations, avaries, retours et ajustements ;
- recettes, dépenses et écarts ;
- clôture avec verrouillage et réouverture justifiée ;
- rapports exportables CSV ;
- journal d’audit ;
- sauvegarde JSON.

## Structure

```text
backend/       API Node.js/Express + PostgreSQL
frontend/      React + TypeScript + Vite
db/            migrations et seed SQL
docs/          analyse, diagrammes, guide, API
```
