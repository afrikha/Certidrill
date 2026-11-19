L'AWS Well-Architected Framework (cadre AWS Well-Architected) décrit comment construire et évaluer des charges de travail sur AWS. L'examen vous demande de nommer ses piliers, de reconnaître à quel pilier appartient une pratique ou un principe de conception, et de départager deux piliers quand un énoncé pourrait correspondre aux deux.

<!-- section: framework | objectives: 1.2.1 -->
## Le cadre AWS Well-Architected

Le cadre est un ensemble de **piliers**, de **principes de conception**, de **bonnes pratiques** et de **questions** qui aident les architectes cloud à construire une infrastructure sécurisée, performante, résiliente et efficace, et à évaluer une charge de travail existante au regard de ces pratiques. Il décrit une bonne architecture ; il ne déploie rien.

| Élément | Ce que c'est |
| --- | --- |
| **Piliers** | Six domaines d'attention : excellence opérationnelle, sécurité, fiabilité, efficacité des performances, optimisation des coûts, durabilité |
| **Principes de conception** | Une courte liste de principes pour chaque pilier, plus des principes de conception généraux pour l'ensemble du cadre |
| **Lentilles** (lenses) | Des extensions du cadre pour une technologie ou un secteur (par exemple, les applications sans serveur) |
| **AWS Well-Architected Tool** | Un service de l'AWS Management Console où vous répondez aux questions du cadre pour une charge de travail, obtenez la liste des risques élevés et moyens et suivez les améliorations dans le temps |

Les **principes de conception généraux** du cadre :

1. **Stop guessing your capacity needs** (ne plus deviner vos besoins en capacité) : utilisez autant ou aussi peu de capacité que nécessaire et mettez à l'échelle automatiquement.
2. **Test systems at production scale** (tester les systèmes à l'échelle de la production) : créez à la demande un environnement de test à l'échelle de la production, puis supprimez-le ; vous ne payez que pendant son exécution.
3. **Automate with architectural experimentation in mind** (automatiser en pensant à l'expérimentation) : l'automatisation crée et réplique des charges de travail à faible coût, et les modifications peuvent être suivies et annulées.
4. **Consider evolutionary architectures** (envisager des architectures évolutives) : grâce à l'automatisation et aux tests à la demande, les changements de conception sont moins risqués, et l'architecture peut évoluer avec l'entreprise.
5. **Drive architectures using data** (piloter l'architecture par les données) : mesurez l'effet des choix d'architecture sur la charge de travail et décidez à partir des faits.
6. **Improve through game days** (progresser par des journées de simulation) : simulez régulièrement des événements de production pour trouver les faiblesses et entraîner l'équipe.

> **Piège d'examen.** Le cadre Well-Architected évalue **l'architecture d'une charge de travail** (six piliers). Le Framework d'adoption du Cloud AWS (AWS CAF, chapitre 13) prépare **une organisation** au cloud (six perspectives). Les deux ont un élément « Security » : regardez si l'énoncé parle d'un système ou de la transformation de l'entreprise.

<!-- section: pillars | objectives: 1.2.2 -->
## Les six piliers

| Pilier | Objet | Principes de conception à reconnaître |
| --- | --- | --- |
| **Excellence opérationnelle** (operational excellence) | Exécuter et surveiller les systèmes, et améliorer en continu les processus et procédures | Mettre en œuvre l'observabilité ; automatiser en toute sécurité quand c'est possible (les opérations en tant que code) ; faire des modifications fréquentes, petites et réversibles ; affiner souvent les procédures d'exploitation ; anticiper les défaillances ; tirer les leçons de tous les événements et métriques d'exploitation |
| **Sécurité** (security) | Protéger les données, les systèmes et les ressources | Mettre en place une base d'identité solide (moindre privilège) ; assurer la traçabilité (journaux et audit) ; appliquer la sécurité à toutes les couches ; automatiser les bonnes pratiques de sécurité ; protéger les données en transit et au repos ; tenir les personnes à l'écart des données ; se préparer aux événements de sécurité |
| **Fiabilité** (reliability) | Remplir correctement et régulièrement la fonction prévue, se rétablir après une panne et répondre à la demande | Se rétablir automatiquement après une panne ; tester les procédures de reprise ; mettre à l'échelle horizontalement pour augmenter la disponibilité globale ; ne plus deviner la capacité ; gérer le changement par l'automatisation |
| **Efficacité des performances** (performance efficiency) | Utiliser efficacement les ressources de calcul pour répondre aux exigences, et garder cette efficacité quand la demande et les technologies évoluent | Démocratiser les technologies avancées (les consommer comme services gérés) ; devenir mondial en quelques minutes ; utiliser des architectures sans serveur ; expérimenter plus souvent ; tenir compte de la « sympathie mécanique » (la technologie la mieux adaptée au mode d'accès) |
| **Optimisation des coûts** (cost optimization) | Apporter de la valeur métier au prix le plus bas, en évitant les coûts inutiles | Mettre en œuvre la gestion financière du cloud ; adopter un modèle de consommation (ne payer que ce qu'on utilise) ; mesurer l'efficacité globale ; ne plus dépenser pour des tâches lourdes et indifférenciées ; analyser et attribuer les dépenses |
| **Durabilité** (sustainability) | Réduire l'impact environnemental de l'exécution des charges de travail cloud | Comprendre son impact ; fixer des objectifs de durabilité ; maximiser l'utilisation ; anticiper et adopter des offres matérielles et logicielles plus efficaces ; utiliser des services gérés ; réduire l'impact en aval des charges de travail cloud |

La durabilité est le pilier le plus récent ; il y a **six** piliers, pas cinq.

> **Conseil d'examen.** Les noms des piliers sont souvent les options de la question, en anglais. Retenez les noms exacts : « performance efficiency » (pas « performance »), « cost optimization » (pas « cost reduction »), « operational excellence » (pas « operations »).

<!-- section: pillar-differences | objectives: 1.2.3 -->
## Distinguer les piliers

La plupart des questions décrivent une pratique et demandent le pilier. La difficulté vient des piliers qui partagent un thème :

| Pratique décrite dans l'énoncé | Pilier | Pas ce pilier, parce que |
| --- | --- | --- |
| Déployer les modifications d'infrastructure avec AWS CloudFormation par petites étapes réversibles | Excellence opérationnelle | La fiabilité concerne la survie aux pannes, pas la manière de faire les modifications |
| Exécuter l'application dans plusieurs zones de disponibilité pour qu'elle survive à la panne d'un centre de données | Fiabilité | L'efficacité des performances concerne la vitesse et l'adéquation des ressources, pas les pannes |
| Sauvegarder les données et tester régulièrement leur restauration | Fiabilité | La sécurité protège les données contre les accès non autorisés ; la reprise après une perte relève de la fiabilité |
| Choisir une base de données spécialisée ou une famille d'instances adaptée à la charge de travail | Efficacité des performances | L'optimisation des coûts choisirait l'option la moins chère qui répond encore au besoin |
| Servir le contenu depuis les emplacements périphériques pour réduire la latence | Efficacité des performances | La fiabilité ne concerne pas la latence |
| Accorder le moindre privilège, activer la MFA, chiffrer les données, activer CloudTrail | Sécurité | L'excellence opérationnelle couvre la surveillance des opérations, pas le contrôle d'accès |
| Utiliser des Savings Plans, dimensionner correctement les instances, supprimer les ressources inutilisées | Optimisation des coûts | La durabilité aime aussi les ressources en moins, mais l'objectif énoncé est l'argent |
| Maximiser l'utilisation, choisir des instances basées sur Graviton, économes en énergie, réduire l'empreinte carbone | Durabilité | L'optimisation des coûts concerne la dépense ; l'objectif énoncé ici est l'impact environnemental |
| Répondre aux incidents avec des procédures (runbooks) et tirer les leçons des analyses post-incident | Excellence opérationnelle | La sécurité couvre spécifiquement les incidents de sécurité (« prepare for security events ») |

> **Piège d'examen.** « Stop guessing capacity » figure dans les principes de conception généraux et dans le pilier fiabilité, et « go global in minutes » dans le pilier efficacité des performances. Lisez la question : si elle demande un pilier, choisissez d'après le comportement décrit (pannes, vitesse, coût, impact), pas d'après une formule dont vous vous souvenez.

<!-- section: key-points -->
## Points clés

- Cadre Well-Architected : piliers, principes de conception, bonnes pratiques et questions pour construire et évaluer des charges de travail ; l'AWS Well-Architected Tool mène l'évaluation.
- Six piliers : excellence opérationnelle, sécurité, fiabilité, efficacité des performances, optimisation des coûts, durabilité.
- Opérations en tant que code et petites modifications : excellence opérationnelle. Rétablissement après panne, plusieurs zones de disponibilité : fiabilité. Bon type de ressource, sans serveur, périphérie : efficacité des performances. Ne payer que ce qu'on utilise : optimisation des coûts. Maximiser l'utilisation, réduire l'impact : durabilité.
- Le cadre Well-Architected s'applique aux charges de travail ; l'AWS CAF aux organisations.
