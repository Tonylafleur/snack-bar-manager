# User stories et critères d’acceptation

## Authentification

En tant que gérant, je veux me connecter avec un identifiant et un mot de passe afin de protéger mes données.

Critères :

- mauvais identifiants refusés ;
- jeton de session stocké côté client ;
- API inaccessible sans authentification.

## Entrée fournisseur

En tant que gérant, je veux enregistrer une livraison fournisseur au magasin central afin de mettre le stock à jour.

Critères :

- article obligatoire ;
- quantité positive ;
- unité saisie convertie en unité de référence ;
- date d’opération et date réelle enregistrées ;
- mouvement audité.

## Transfert vers comptoir

En tant que gérant, je veux transférer du stock central vers un comptoir afin de ravitailler les points de vente.

Critères :

- destination standard ou VIP obligatoire ;
- transfert supérieur au stock central refusé ;
- sortie centrale et entrée comptoir créées dans une transaction ;
- stocks mis à jour simultanément ;
- mouvement visible dans le journal.

## Vente comptoir

En tant que gérant, je veux enregistrer les ventes ou sorties d’un comptoir afin de calculer le stock théorique et la recette.

Critères :

- vente diminue le stock ;
- ration et avarie diminuent le stock sans recette ;
- prix standard ou VIP appliqué selon le comptoir ;
- stock négatif refusé sauf ajustement autorisé.

## Clôture

En tant que gérant, je veux clôturer une journée afin de verrouiller la période et reporter les stocks finaux.

Critères :

- inventaire physique saisi ;
- manquant et surplus calculés ;
- période verrouillée ;
- réouverture possible uniquement avec justification.
