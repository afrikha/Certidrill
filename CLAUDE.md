@AGENTS.md

# Consignes de travail (pour Claude)

## Fusion des pull requests

Le propriétaire du dépôt autorise la fusion **automatique** de toute PR ouverte par Claude, sans attendre de « Fusion » explicite, dès que les trois conditions sont réunies :

1. **CI verte** : tous les jobs du dernier commit poussé ont réussi (aucun en échec, aucun en cours).
2. **SonarCloud bon** : quality gate « Passed » sur ce même commit.
3. **Tous les commentaires traités** : chaque commentaire de revue (humain ou automatique) a reçu un correctif poussé ou une réponse argumentée, et les fils sont résolus. Une remarque mineure reportée ne compte comme traitée que si elle est notée dans un commentaire de la PR comme point à reprendre dans la prochaine, puis reprise dans celle-ci.

Exceptions : ne **pas** fusionner tant qu'il reste, sans décision du propriétaire, une remarque qu'un relecteur (humain, revue automatique ou SonarCloud) présente comme relevant de la **sécurité**, du **RGPD** ou de la confidentialité. Ce n'est pas à Claude de juger qu'elle n'en relève pas. Même chose pour un point que le propriétaire a demandé de lui soumettre. Dans ces cas, lui demander.

Après la fusion : se désabonner de l'activité de la PR, puis remettre la branche de travail sur `origin/main` (`git push --force-with-lease`).

## Rappels

- Ne créer une PR que sur demande ; pousser uniquement sur la branche de travail désignée.
- Aucun identifiant de modèle dans les commits, PR ou fichiers du dépôt.
- Ne jamais demander de secret dans la conversation : les clés vont dans `.env` sur le VPS ou dans les secrets GitHub.
- Les remarques mineures d'une revue automatique ne déclenchent pas un push à elles seules : répondre une fois, puis les reprendre dans le push suivant.
- Les questions restent en brouillon jusqu'à relecture humaine.
- Communiquer avec le propriétaire en français.
