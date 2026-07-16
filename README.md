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

## Déploiement Vercel avec PostgreSQL

Le site Vercel fonctionne en mode démo si aucune base n'est configurée. Pour activer les données persistantes :

1. Créer une base PostgreSQL hébergée, par exemple via une intégration Postgres du Vercel Marketplace ou Neon.
2. Exécuter le script SQL `db/migrations/001_schema_seed.sql` dans cette base.
3. Dans Vercel, ouvrir le projet `snack-bar-manager`, puis `Settings` > `Environment Variables`.
4. Ajouter `DATABASE_URL` en `Production` avec l'URL PostgreSQL publique, idéalement avec `sslmode=require`.
5. Ajouter aussi `JWT_SECRET` en `Production` avec une valeur longue et secrète.
6. Redéployer le projet depuis Vercel ou en poussant un commit sur `main`.

Exemple de format :

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=une-valeur-longue-et-secrete
```
