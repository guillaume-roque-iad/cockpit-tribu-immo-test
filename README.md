# Cockpit Tribu Immo — TEST

Version statique de démonstration avec le logo Tribu Immo.

## Isolation
- Données fictives et modifications en mémoire, perdues au rechargement.
- Aucune connexion à la base Firebase des conseillers ; connect-src none.
- Le module LAB-FT réel est désactivé dans cette démonstration.
- Ne pas saisir de données clients réelles.

## Cloudflare Pages avec GitHub
Créer un nouveau projet Pages et importer ce dépôt.
- Branche : main
- Framework : None
- Commande : exit 0
- Répertoire de sortie : dist
- Aucun secret ni variable d’environnement requis.

Conserver une adresse de test distincte. Ne pas remplacer le projet existant ou son domaine.
Sur Cloudflare, cette démonstration statique ne nécessite pas de connexion ChatGPT.
La liaison Cloudflare doit être réalisée avant que les commits déclenchent les publications automatiques.
