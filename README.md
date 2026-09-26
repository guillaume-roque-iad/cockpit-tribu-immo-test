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
