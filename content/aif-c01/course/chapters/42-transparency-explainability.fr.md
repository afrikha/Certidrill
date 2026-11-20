Les utilisateurs, les auditeurs et les régulateurs ont de plus en plus besoin de savoir comment un système d'IA a été construit et pourquoi il a produit une sortie donnée. L'examen vous demande de distinguer un modèle transparent et explicable d'une boîte noire, de choisir l'outil qui documente un modèle (Amazon SageMaker Model Cards) ou qui l'évalue, de mettre en balance l'interprétabilité, les performances et la sûreté, et de reconnaître les pratiques de conception centrée sur l'humain.

<!-- section: transparent-vs-opaque | objectives: 4.2.1 -->
## Modèles transparents et explicables ou boîtes noires

| Terme | Question à laquelle il répond |
| --- | --- |
| **Transparence** | Comment le modèle a-t-il été construit et comment est-il utilisé ? Les sources de données, le processus d'entraînement, l'usage prévu, les limites et les résultats d'évaluation sont publiés |
| **Interprétabilité** | Une personne peut-elle suivre directement la logique interne du modèle ? |
| **Explicabilité** | Pourquoi le modèle a-t-il produit cette sortie précise, en des termes compréhensibles par une personne ? |

| | Transparent et explicable | Ni transparent ni explicable (boîte noire) |
| --- | --- | --- |
| **Exemples** | Régression linéaire et logistique, arbres de décision, systèmes à base de règles | Réseaux neuronaux profonds, grands modèles de fondation, de nombreux ensembles de modèles |
| **Explication** | Se lit dans le modèle : coefficients, chemin dans l'arbre | Exige des techniques externes qui l'approchent, comme les attributions de caractéristiques SHAP, ou la documentation du modèle |
| **Performances** | Souvent plus faibles sur des données complexes (images, langage) | Souvent plus élevées sur des tâches complexes |
| **Usage adapté** | Décisions réglementées qui doivent être justifiées (crédit, assurance, recrutement) | Tâches où la qualité compte plus qu'une justification pas à pas |

> **Piège d'examen.** Un modèle de fondation n'est pas explicable simplement parce que ses réponses sont rédigées en langage courant : le texte qu'il génère n'est pas une trace de son raisonnement interne. Quand une réglementation exige d'expliquer chaque décision, un modèle interprétable plus simple peut être la bonne réponse, même avec une exactitude plus faible.

<!-- section: transparency-tools | objectives: 4.2.2 -->
## Les outils pour identifier les modèles transparents et explicables

| Outil ou source | Ce qu'il fournit |
| --- | --- |
| **Amazon SageMaker Model Cards** | Un emplacement unique pour documenter un modèle à des fins de gouvernance et de reporting : usages prévus, niveau de risque (unknown, low, medium, high), informations métier, détails d'entraînement (jeux de données, hyperparamètres, métriques), résultats d'évaluation, considérations éthiques, mises en garde et recommandations |
| **Évaluations Amazon Bedrock** | Des scores comparables d'exactitude, de robustesse, de toxicité et de qualité, par évaluation automatique, humaine ou LLM-as-a-judge |
| **AWS AI Service Cards** | La documentation par AWS de ses services et modèles d'IA : usages prévus et limites, choix de conception responsable, bonnes pratiques d'optimisation des performances |
| **Modèles open source** | Poids, code et souvent détails d'entraînement publiés, qui peuvent être inspectés et testés ; disponibles par exemple via SageMaker JumpStart |
| **Documentation des données** | Origine, méthode de collecte, composition et traitement des données d'entraînement |
| **Licences** | Droits et restrictions d'usage commercial, de modification et de redistribution du modèle et de ses sorties |

- Les fiches de modèle (model cards) sont des **enregistrements immuables** : toute modification autre que le statut d'approbation crée une nouvelle version, ce qui conserve l'historique pour les audits. Une fiche de modèle peut être exportée en PDF pour la partager avec les parties prenantes.
- L'explicabilité des modèles de ML classiques (SHAP) se calculait avec Amazon SageMaker Clarify, qui n'est plus ouvert aux nouveaux clients depuis le 30 juillet 2026 ; AWS recommande la bibliothèque open source `shap` pour les nouveaux projets.

> **Conseil d'examen.** « Documenter l'usage prévu, le niveau de risque et les résultats d'évaluation d'un modèle pour les auditeurs » = SageMaker Model Cards. « Comparer des FM sur la qualité et la toxicité avant de choisir » = évaluations Amazon Bedrock.

<!-- section: safety-transparency-tradeoffs | objectives: 4.2.3 -->
## Les compromis entre sûreté et transparence

- **Interprétabilité contre performances** : les modèles simples sont plus faciles à expliquer mais souvent moins exacts sur des données complexes ; les modèles complexes sont plus performants mais opaques. Mesurez les deux : l'exactitude perdue en choisissant un modèle interprétable, et la qualité d'explication perdue en choisissant un modèle complexe.
- **Transparence contre sûreté et sécurité** : publier tous les détails (invites système, règles des barrières de protection, fonctionnement interne complet du modèle, données d'entraînement) aide les attaquants à concevoir des injections d'invite et des débridages, ou à extraire des données privées. Publiez ce dont les utilisateurs et les auditeurs ont besoin (finalité, limites, catégories de données, résultats d'évaluation) sans exposer les protections.
- **Les contrôles de sûreté réduisent la transparence** : les barrières de protection et les filtres bloquent ou modifient des réponses ; indiquez aux utilisateurs quand un contenu est filtré et pourquoi, à un niveau approprié.
- **Confidentialité** : publier les données d'entraînement améliore la transparence mais peut exposer des données personnelles.

Le bon équilibre dépend du risque du cas d'usage : les décisions à fort impact sur des personnes exigent plus d'explicabilité, même au prix d'une partie des performances.

<!-- section: human-centered-design | objectives: 4.2.4 -->
## La conception centrée sur l'humain pour une IA explicable

La conception centrée sur l'humain construit le système d'IA autour des personnes qui l'utilisent et qu'il concerne.

| Principe | Pratique |
| --- | --- |
| **Transparence des décisions de l'IA** | Indiquez aux utilisateurs qu'ils interagissent avec une IA ; montrez les sources ou les citations d'une réponse, les principaux facteurs d'une décision et son niveau de confiance |
| **Mécanismes de commentaires des utilisateurs** | Pouce levé ou baissé, notes, corrections et signalements de problèmes, qui alimentent l'évaluation, l'amélioration des invites et le réglage précis (RLHF) |
| **Prise de décision amplifiée** | L'IA assiste des personnes, qui gardent la décision finale pour les cas à fort enjeu ; des explications claires et exploitables les y aident |
| **Prise de décision sans biais** | Vérifiez les décisions pour détecter les biais entre groupes d'utilisateurs et permettez de contester une décision |
| **Supervision humaine** | Transfert à une personne, revue des sorties à faible confiance, possibilité de passer outre l'IA |
| **Explications accessibles** | Des explications adaptées au public : langage courant pour les clients, détails pour les experts et les auditeurs |

> **Piège d'examen.** Recueillir les commentaires des utilisateurs ne suffit pas : la conception doit boucler la boucle, pour que ces commentaires soient examinés et améliorent le système. Une « intervention humaine » pour les décisions à fort impact est une pratique de conception centrée sur l'humain, pas le signe d'un échec de l'IA.

<!-- section: key-points -->
## Points clés

- Transparence = comment le modèle a été construit et est utilisé ; interprétabilité = logique interne lisible ; explicabilité = pourquoi cette sortie.
- Modèles interprétables (régression, arbres de décision) ou boîtes noires (réseaux neuronaux profonds, FM) : explicabilité contre performances.
- SageMaker Model Cards documente les usages prévus, le niveau de risque, l'entraînement et l'évaluation ; versions immuables ; export PDF.
- Autres sources : évaluations Bedrock, AI Service Cards, modèles open source, documentation des données, licences.
- Trop de transparence peut affaiblir la sécurité ; les filtres réduisent la transparence ; équilibrez selon le risque.
- Conception centrée sur l'humain : signaler l'usage de l'IA et les sources, recueillir et exploiter les commentaires, garder l'humain aux commandes des décisions à fort enjeu.
