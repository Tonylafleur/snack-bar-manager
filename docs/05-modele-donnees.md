# Modèle conceptuel et logique de données

## Tables principales

- `users` : compte gérant.
- `categories` : familles d’articles.
- `items` : articles et équivalences.
- `item_prices` : historique des prix.
- `locations` : magasin central, comptoir standard, comptoir VIP.
- `stocks` : quantité par article et emplacement.
- `stock_movements` : journal de stock.
- `finance_entries` : versements, dépenses, pertes, écarts.
- `closures` : clôtures et réouvertures.
- `audit_logs` : traçabilité complète.

## Principes

- La quantité stockée dans `stocks.quantity_base` est toujours exprimée dans l’unité de référence.
- `stock_movements.quantity_base` conserve la quantité convertie.
- `stock_movements.unit_input` et `quantity_input` conservent la saisie utilisateur.
- Les mouvements financiers conservent `amount_xaf` et le prix utilisé au moment de l’opération.
- Les opérations de transfert utilisent `transfer_group_id` pour relier sortie centrale et entrée comptoir.
