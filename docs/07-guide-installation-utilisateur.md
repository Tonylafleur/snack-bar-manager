# Guide d’installation, sauvegarde, restauration et utilisation

## Installation

1. Installer Docker Desktop.
2. Ouvrir PowerShell.
3. Exécuter :

```powershell
cd D:\snack-bar-manager
docker compose up --build -d
```

4. Ouvrir `http://localhost:5320`.

## Sauvegarde

Dans Paramètres, cliquer sur **Télécharger sauvegarde**. Le fichier JSON contient les articles, stocks, mouvements, finances, clôtures et audit.

## Restauration

Dans cette première version, la restauration est disponible par API `POST /api/restore`. En production, elle devra être protégée par une confirmation forte et une sauvegarde automatique préalable.

## Utilisation quotidienne

1. Se connecter avec le compte gérant.
2. Vérifier les alertes sur le tableau de bord.
3. Enregistrer les livraisons fournisseur dans Magasin central.
4. Ravitaillement : créer un transfert vers Standard ou VIP.
5. Enregistrer les ventes, rations, avaries et retours par comptoir.
6. Saisir les versements et dépenses.
7. Faire l’inventaire physique.
8. Clôturer la période.
9. Exporter le rapport CSV si nécessaire.

## Bonnes pratiques

- Ne pas retarder les saisies ; si c’est le cas, utiliser la date d’opération réelle.
- Vérifier les quantités converties avant validation.
- Justifier toute annulation ou réouverture.
- Contrôler les manquants importants avant clôture définitive.
