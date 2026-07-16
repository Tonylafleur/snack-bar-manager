# Configuration PostgreSQL sur Vercel

Ce guide explique comment connecter `snack-bar-manager` a une base PostgreSQL persistante sur Vercel.

## Pourquoi cette etape est necessaire

L'application deployee sur Vercel peut afficher l'interface, mais les donnees persistantes demandent une base PostgreSQL externe.

Sans variable `DATABASE_URL`, l'application fonctionne en mode demo temporaire.

## 1. Creer une base PostgreSQL

Vercel Postgres n'est plus disponible pour les nouveaux projets. Il faut utiliser une integration du Marketplace Vercel.

Options recommandees :

- Neon
- Supabase
- AWS Aurora Postgres
- Prisma Postgres

Option simple recommandee : Neon.

## 2. Installer Neon depuis Vercel

1. Ouvrir le dashboard Vercel.
2. Aller dans le projet `snack-bar-manager`.
3. Aller dans `Storage`, `Integrations` ou `Marketplace`.
4. Chercher `Neon`.
5. Cliquer sur `Install` ou `Add Integration`.
6. Selectionner le projet `snack-bar-manager`.
7. Creer une base PostgreSQL.
8. Donner un nom a la base, par exemple :

```text
snack_manager
```

## 3. Recuperer la chaine de connexion

Dans Neon ou dans les variables Vercel injectees, recuperer la chaine de connexion PostgreSQL.

Elle ressemble a ceci :

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Exemple fictif :

```text
postgresql://snack_owner:mot_de_passe@ep-example.eu-central-1.aws.neon.tech/snack_manager?sslmode=require
```

Ne pas mettre cette valeur dans GitHub. Elle doit rester dans Vercel uniquement.

## 4. Configurer les variables dans Vercel

Dans Vercel :

1. Ouvrir le projet `snack-bar-manager`.
2. Aller dans `Settings`.
3. Aller dans `Environment Variables`.
4. Ajouter la variable :

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

5. Ajouter aussi :

```text
JWT_SECRET=2b3f78b52c0f4d6f9a1e7c93b6d44a10f8e2c5a7d91b0c6e3f4a8d72c9e11b65
```

6. Cocher au minimum l'environnement `Production`.
7. Enregistrer.

## 5. Initialiser les tables et les donnees

La base doit recevoir le script SQL du projet :

```text
db/migrations/001_schema_seed.sql
```

Depuis le dashboard Vercel/Neon, ouvrir l'outil SQL ou l'onglet `Query`, puis executer le contenu complet de ce fichier.

Ce script cree :

- les utilisateurs ;
- les emplacements ;
- les categories ;
- les produits ;
- les stocks ;
- les tables de mouvements ;
- les tables de finances ;
- les donnees de depart.

Compte cree par le script :

```text
utilisateur : gerant
mot de passe : Gerant123!
```

## 6. Redeployer le projet

Apres avoir ajoute `DATABASE_URL` et `JWT_SECRET` :

1. Retourner dans Vercel.
2. Ouvrir le projet `snack-bar-manager`.
3. Aller dans `Deployments`.
4. Relancer un deploiement avec `Redeploy`.

Ou bien pousser un nouveau commit sur la branche `main`.

## 7. Tester

Tester l'API :

```text
https://snack-bar-manager.vercel.app/api/health
```

Tester l'application :

```text
https://snack-bar-manager.vercel.app/
```

Identifiants :

```text
gerant
Gerant123!
```

## Probleme courant

### Message : Configurer DATABASE_URL

Cause : Vercel ne trouve pas la variable `DATABASE_URL`.

Solution :

- verifier que `DATABASE_URL` existe dans `Settings > Environment Variables` ;
- verifier que l'environnement `Production` est coche ;
- verifier que la chaine contient `sslmode=require` ;
- redeployer le projet.

### Erreur reseau a la connexion

Causes possibles :

- l'API Vercel n'est pas redeployee ;
- `DATABASE_URL` est absente ou incorrecte ;
- les tables n'ont pas encore ete creees ;
- le script SQL n'a pas ete execute ;
- le mot de passe ou l'utilisateur PostgreSQL est incorrect.

## Liens utiles

- Documentation Postgres Vercel : https://vercel.com/docs/postgres
- Marketplace Storage Vercel : https://vercel.com/docs/marketplace-storage
- Neon sur Vercel : https://vercel.com/marketplace/neon/neon
