@AGENTS.md

# Consignes de travail (pour Claude)

## Fusion des pull requests

Le propriétaire du dépôt autorise la fusion **automatique** de toute PR ouverte par Claude, sans attendre de « Fusion » explicite, dès que les trois conditions sont réunies :

1. **CI verte** : tous les jobs du dernier commit poussé ont réussi (aucun en échec, aucun en cours).
2. **SonarCloud bon** : quality gate « Passed » sur ce même commit.
3. **Tous les commentaires traités** : chaque commentaire de revue (humain ou automatique) a reçu un correctif poussé ou une réponse argumentée, et les fils sont résolus. Une remarque mineure reportée ne compte comme traitée que si elle est notée dans un commentaire de la PR comme point à reprendre dans la prochaine, puis reprise dans celle-ci.

Exceptions : ne **pas** fusionner tant qu'il reste, sans décision du propriétaire, une remarque qu'un relecteur (humain, revue automatique ou SonarCloud) présente comme relevant de la **sécurité**, du **RGPD** ou de la confidentialité. Ce n'est pas à Claude de juger qu'elle n'en relève pas. Même chose pour un point que le propriétaire a demandé de lui soumettre. Dans ces cas, lui demander.

Après la fusion : se désabonner de l'activité de la PR, puis remettre la branche de travail sur `origin/main` (`git push --force-with-lease`).

## Production : VPS partagé avec ClaiRH (depuis le 14/11/2026)

Le serveur de production est partagé avec ClaiRH, un autre projet du propriétaire qui a des clients, et c'est le Caddy de ClaiRH qui sert Certidrill. Toute commande donnée au propriétaire pour ce serveur suit le README, section « Serveur actuel : partagé avec ClaiRH » :

- la configuration HTTPS de Certidrill est dans `/opt/clairh/deploy/vps/sites/certidrill.caddy`, pas dans `deploy/Caddyfile` : une modification de l'un se reporte dans l'autre ;
- on déploie avec `docker compose up -d --build`, jamais `docker compose down` ;
- on ne renomme ni le projet compose, ni `app`, ni le réseau (`certidrill-app-1` et `certidrill_default` sont écrits en dur côté ClaiRH) ;
- on ne publie rien sur les ports 80 et 443, et on ne réactive pas le Caddy de Certidrill ;
- aucun `prune` de volumes ou de réseaux, et pas de redémarrage de Docker ou du VPS sans coordination.

## Rappels

- Ne créer une PR que sur demande ; pousser uniquement sur la branche de travail désignée.
- Aucun identifiant de modèle dans les commits, PR ou fichiers du dépôt.
- Ne jamais demander de secret dans la conversation : les clés vont dans `.env` sur le VPS ou dans les secrets GitHub.
- Les remarques mineures d'une revue automatique ne déclenchent pas un push à elles seules : répondre une fois, puis les reprendre dans le push suivant.
- Les questions restent en brouillon jusqu'à relecture humaine.
- Communiquer avec le propriétaire en français.
