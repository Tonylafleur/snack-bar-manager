# Analyse fonctionnelle détaillée

## Acteur principal

- Gérant : administre les articles, saisit les livraisons, transferts, ventes, dépenses, inventaires, clôtures et consulte les rapports.

## Entités métier

- Article : produit vendable ou suivi en stock.
- Conditionnement : casier, pack, carton, bouteille, canette, litre.
- Emplacement : magasin central, comptoir standard, comptoir VIP.
- Mouvement : entrée, transfert, vente, ration, avarie, retour, ajustement, annulation.
- Stock : quantité par article et emplacement dans l’unité de référence.
- Prix : historique prix d’achat, prix standard, prix VIP.
- Finance : versement, dépense, écart, valorisation des pertes.
- Clôture : verrouillage d’une période et report de situation finale.
- Audit : action, utilisateur, objet, date réelle, justification.

## Règles métier critiques

- Un transfert valide crée une sortie centrale et une entrée comptoir dans la même transaction.
- Le stock central disponible est contrôlé avant transfert.
- Une opération validée n’est pas supprimée : elle est annulée par mouvement compensatoire motivé.
- La date d’opération et la date réelle de saisie sont distinctes.
- Rations et avaries diminuent le stock sans générer de vente.
- Les prix utilisés dans les rapports sont ceux actifs au moment de l’opération.
- XAF est la devise par défaut.
- Toute clôture verrouille les opérations de la période sauf réouverture exceptionnelle justifiée.

## Indicateurs de tableau de bord

- Stock global valorisé.
- Stock par emplacement.
- Articles sous seuil.
- Recettes du jour.
- Dépenses du jour.
- Avaries et rations.
- Manquants/surplus.
- Derniers mouvements.

## Exports

- CSV natif.
- PDF via impression navigateur dans cette première version.
- Excel prévu via export XLSX dans une évolution.
