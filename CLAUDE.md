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

Certidrill tourne dans `/opt/certidrill` sur un VPS qu'il partage avec ClaiRH, un autre projet du propriétaire, installé dans `/opt/clairh`, qui a des clients. La procédure complète est dans le runbook ClaiRH `docs/runbooks/vps-deployment.md`, § 4 bis. Toute commande donnée au propriétaire pour ce serveur doit respecter ce qui suit.

- **HTTPS** : le Caddy de ClaiRH (`clairh-caddy-1`) est la seule entrée sur les ports 80 et 443, et il sert aussi Certidrill. Le Caddy de Certidrill est désactivé par `/opt/certidrill/compose.override.yml` (profil `disabled`). `deploy/Caddyfile` ne sert donc plus sur ce serveur, et les commandes Caddy du README ne s'y appliquent pas.
- **Configuration HTTPS de Certidrill** : elle se trouve dans `/opt/clairh/deploy/vps/sites/certidrill.caddy`, qui n'est versionné nulle part et reprend l'ancien Caddyfile, sans le bloc `trusted_proxies` de Cloudflare. Toute modification (en-têtes, limites de corps, routes, domaines) se reporte dans ce fichier, puis s'applique ainsi :
  ```bash
  cd /opt/clairh/deploy/vps
  docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
  ```
  Si Cloudflare repasse en mode proxy, `{client_ip}` deviendra l'adresse de Cloudflare : à régler côté ClaiRH.
- **Réseau et noms** : le Caddy de ClaiRH est branché sur le réseau `certidrill_default` et joint `certidrill-app-1:3000`. Ces noms sont écrits en dur côté ClaiRH. Les certificats sont dans le volume `clairh_caddy-data`.
- **Déployer** : `cd /opt/certidrill && docker compose build && docker compose up -d`, ou `docker compose up -d --build`. Le service `migrate` applique les migrations et le seed.
- **À ne jamais proposer sans coordination avec ClaiRH** :
  - `docker compose down` dans `/opt/certidrill` : Docker supprimerait le réseau `certidrill_default` ;
  - renommer le projet compose, le service `app` ou le réseau ;
  - passer `app` à plusieurs répliques ;
  - réactiver le Caddy de Certidrill ou publier quoi que ce soit sur les ports 80 et 443 ;
  - `docker system prune -a --volumes`, `docker volume prune` ou `docker network prune` : les volumes de ClaiRH sont sur la même machine. Pour faire de la place, se limiter à `docker image prune` sur les images Certidrill ;
  - redémarrer Docker ou le VPS.
- **Ressources** : la RAM est partagée avec ClaiRH, qui en utilise une bonne partie, et davantage quand son instance de démo tourne.
- **Diagnostic** : un 502 sur `certidrill.com` signifie presque toujours que `certidrill-app-1` est arrêté, renommé, ou plus sur `certidrill_default`.
  ```bash
  curl -sI https://certidrill.com | head -3
  cd /opt/clairh/deploy/vps && docker compose ps caddy && docker compose logs --tail 100 caddy | grep -i certidrill
  docker inspect clairh-caddy-1 --format '{{json .NetworkSettings.Networks}}' | grep -o certidrill_default
  cd /opt/certidrill && docker compose ps
  ```

## Rappels

- Ne créer une PR que sur demande ; pousser uniquement sur la branche de travail désignée.
- Aucun identifiant de modèle dans les commits, PR ou fichiers du dépôt.
- Ne jamais demander de secret dans la conversation : les clés vont dans `.env` sur le VPS ou dans les secrets GitHub.
- Les remarques mineures d'une revue automatique ne déclenchent pas un push à elles seules : répondre une fois, puis les reprendre dans le push suivant.
- Les questions restent en brouillon jusqu'à relecture humaine.
- Communiquer avec le propriétaire en français.
