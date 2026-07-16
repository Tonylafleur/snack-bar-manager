# Reformulation, ambiguïtés, hypothèses et plan

## Reformulation

Le gérant d’un snack-bar doit piloter un magasin central et deux comptoirs de vente. Les fournisseurs livrent au magasin central. Le gérant saisit les entrées fournisseur, transfère les produits vers le comptoir standard ou VIP, suit les ventes et les sorties non commerciales, contrôle les écarts, clôture les journées ou périodes, et consulte des rapports financiers en XAF.

La solution doit être simple, responsive, rapide, contrôlée par audit, et empêcher les erreurs critiques : transfert supérieur au stock, suppression silencieuse d’opérations, incohérence entre sortie centrale et entrée comptoir.

## Ambiguïtés identifiées

- Les prix VIP sont-ils toujours supérieurs aux prix standard ou peuvent-ils être égaux ?
- Les ventes sont-elles saisies article par article ou par inventaire final uniquement ?
- La clôture est-elle quotidienne obligatoire ou périodique libre ?
- Les dépenses sont-elles affectées à un comptoir ou globales au snack-bar ?
- Les avaries et rations doivent-elles être valorisées au prix d’achat ou au prix de vente ?
- La consigne des bouteilles est future, donc non incluse dans le calcul actuel.
- La restauration doit-elle écraser toute la base ou créer un import contrôlé ?

## Hypothèses retenues

- Le gérant est l’utilisateur principal, avec un compte administrateur unique au départ.
- Les quantités sont stockées dans l’unité de référence de l’article : bouteille, canette, litre ou unité.
- Les prix sont historisés dans `item_prices` et copiés dans les mouvements financiers pour figer les rapports.
- Les dépenses peuvent être globales ou rattachées à un emplacement.
- Les rations et avaries diminuent le stock et sont valorisées séparément sans recette.
- La clôture peut être journalière ou périodique avec date début et fin.
- Toute annulation crée un mouvement compensatoire audité.

## Plan d’exécution

1. Cadrage fonctionnel et règles métier.
2. Design UX responsive pour gérant non technique.
3. Modélisation des données PostgreSQL.
4. API sécurisée et transactionnelle.
5. Frontend React TypeScript avec écrans métier.
6. Docker Compose local.
7. Tests unitaires et intégration.
8. Documentation installation, sauvegarde, restauration et guide utilisateur.
9. Validation client des ambiguïtés et enrichissements : consignes, multi-utilisateurs, impression PDF avancée.
