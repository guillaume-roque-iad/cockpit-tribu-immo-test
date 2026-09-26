# Cockpit Tribu Immo — TEST

Déploiement Cloudflare Workers depuis main, commande `npx wrangler deploy`.
Les fichiers prêts à publier sont dans dist. Pour reconstruire LAB-FT : `npm ci && npm run build:labft`.

## LAB-FT intégré
Interface reprise du nouveau module Vigilance, accessible dans le Cockpit sans compte ChatGPT.
Le bouton LAB-FT d’une fiche vendeur crée ou retrouve son dossier de test et reprend nom, adresse et prix.
Dossiers, profil et pièces stockés dans IndexedDB sur ce navigateur uniquement. Aucune synchronisation ni sauvegarde serveur. Effacer les données du navigateur efface ces dossiers.
Questionnaire et PDF conservés ; les PDF portent une mention TEST.
Analyse IA et contrôle automatique des gels indisponibles et explicitement signalés. Le registre officiel reste accessible pour consultation manuelle.
Utiliser uniquement des données et pièces fictives. Aucune connexion à Firebase ou aux dossiers réels LAB-FT.
Les vendeurs du Cockpit restent temporaires en mémoire.

## Import de biens depuis le site du conseiller
Accueil → Lien de mon site → Rechercher mes biens → vérifier et sélectionner → créer.
Worker `/api/import-site` : HTML public HTTPS, JSON-LD immobilier, liens du même domaine, 9 pages maximum / 60 résultats. Aucune connexion ni contournement des sites protégés ; pas de rendu JavaScript. Les résultats ne garantissent pas un inventaire exhaustif ni l'appartenance au conseiller. Les redirections nécessitent l'adresse finale.
Dossiers sélectionnés persistés en localStorage, clé `tribu-cockpit-site-import-test-v1`, sans données vendeur déduites. Édition/suppression également enregistrées ; pas de synchronisation entre appareils. Aucune écriture en production.
Vérification : `node import-check.mjs`.

Adaptateur iad : page /conseiller-immobilier/<identifiant>, extraction des cartes « Mes biens disponibles » uniquement. Aucun plafond à 60 pour cette page ; comparaison avec le total annoncé, avertissement si incomplet. Ventes et locations distinguées (loyer séparé du prix de vente). Vérifié sur Guillaume Roque : 105 cartes dont 2 locations au 26/09/2026.
