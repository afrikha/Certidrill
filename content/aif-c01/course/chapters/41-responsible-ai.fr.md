L'IA responsable consiste à concevoir, créer et exploiter des systèmes d'IA équitables, sûrs, véridiques et dont on peut rendre compte. L'examen vous demande de nommer la dimension en jeu dans un scénario, de choisir l'outil qui l'applique (souvent Amazon Bedrock Guardrails), de reconnaître les risques juridiques de l'IA générative et de relier le biais et la variance au sous-ajustement, au surajustement et aux préjudices pour des groupes démographiques.

<!-- section: responsible-ai-features | objectives: 4.1.1 -->
## Les caractéristiques d'une IA responsable

AWS décrit ces dimensions fondamentales de l'IA responsable :

| Dimension | Signification |
| --- | --- |
| **Équité (fairness)** | Tenir compte de l'impact sur les différents groupes de parties prenantes ; éviter les résultats qui désavantagent un groupe (biais) |
| **Explicabilité** | Comprendre et évaluer les sorties du système |
| **Confidentialité et sécurité** | Obtenir, utiliser et protéger les données et les modèles de façon appropriée |
| **Sûreté (safety)** | Empêcher les sorties nuisibles et les usages abusifs |
| **Contrôlabilité** | Disposer de mécanismes pour surveiller et orienter le comportement du système |
| **Véracité et robustesse** | Produire des sorties correctes, même avec des entrées inattendues ou malveillantes |
| **Gouvernance** | Intégrer les bonnes pratiques à la chaîne d'approvisionnement de l'IA, chez les fournisseurs comme chez ceux qui déploient |
| **Transparence** | Aider les parties prenantes à faire des choix éclairés sur leur interaction avec le système |

- Le **biais** est une erreur systématique qui favorise ou pénalise certains groupes ; l'**équité** est l'objectif de résultats équitables.
- L'**inclusivité** signifie que le système fonctionne pour tous les utilisateurs visés : langues, accents, âges, capacités et origines.
- La **robustesse** est un comportement fiable face à des entrées bruitées, inhabituelles ou malveillantes ; la **véracité** est une sortie vraie et exacte (sans hallucination).

<!-- section: responsible-ai-tools | objectives: 4.1.2 -->
## Les outils qui appliquent l'IA responsable

**Amazon Bedrock Guardrails** applique des protections configurables aux entrées des utilisateurs et aux réponses des modèles :

| Protection | Ce qu'elle fait |
| --- | --- |
| **Filtres de contenu** | Détectent et filtrent le texte ou les images nuisibles dans les catégories Hate, Insults, Sexual, Violence, Misconduct et Prompt Attack, avec une intensité configurable |
| **Sujets refusés (denied topics)** | Bloquent les sujets que vous déclarez hors limites pour l'application (par exemple, le conseil en investissement) |
| **Filtres de mots** | Bloquent des mots et expressions personnalisés, ainsi que les grossièretés |
| **Filtres d'informations sensibles** | Bloquent ou masquent les informations personnelles identifiables (PII), plus des expressions régulières personnalisées |
| **Vérifications d'ancrage contextuel (contextual grounding checks)** | Détectent les réponses non ancrées dans la source ou sans rapport avec la requête |
| **Automated Reasoning checks** | Valident les réponses par rapport à des règles logiques que vous définissez |

- Une barrière de protection (guardrail) est associée aux invocations de modèle par son ID et sa version, ou appelée seule avec l'API `ApplyGuardrail`, qui valide n'importe quel texte d'entrée ou de sortie sans invoquer de modèle de fondation (par exemple, la réponse d'un modèle hébergé en dehors d'Amazon Bedrock).
- Vous configurez le message renvoyé quand une entrée ou une réponse est bloquée.
- Pour mesurer les propriétés d'IA responsable avant le déploiement, les évaluations Amazon Bedrock notent la toxicité, la nocivité, les stéréotypes et le refus.
- Les **AWS AI Service Cards** documentent les cas d'utilisation prévus, les limites et les choix de conception responsable des services et modèles d'IA d'AWS.

> **Conseil d'examen.** « Bloquer un sujet, filtrer les contenus haineux ou masquer les PII dans une application d'IA générative, avec un effort minimal » = Amazon Bedrock Guardrails. Des instructions dans l'invite ne sont pas à elles seules un mécanisme d'application.

<!-- section: responsible-model-selection | objectives: 4.1.3 -->
## Des pratiques responsables pour sélectionner un modèle

- **Impact environnemental** : entraîner et exécuter de grands modèles consomme beaucoup d'énergie. Préférez le **plus petit modèle qui répond à l'exigence**, réutilisez un modèle préentraîné plutôt que d'en entraîner un à partir de zéro, et envisagez la distillation pour exécuter un modèle plus petit.
- **Infrastructure efficace** : les services gérés mutualisent la capacité ; des accélérateurs spécialisés comme AWS Inferentia (les instances Inf2 offrent jusqu'à 50 % de performances par watt en plus que des instances Amazon EC2 comparables) réduisent l'énergie par inférence.
- **Région** : le pilier durabilité d'AWS Well-Architected recommande de choisir une Région en fonction à la fois des exigences métier et des objectifs de durabilité.
- **Adéquation à l'usage** : lisez la documentation du modèle (AI Service Cards, fiches de modèle, licence) pour l'usage prévu, les limites connues, les langues et les résultats d'évaluation ; testez le modèle sur vos propres données, y compris pour les biais.

<!-- section: legal-risks | objectives: 4.1.4 -->
## Les risques juridiques de l'IA générative

| Risque | Exemple | Atténuation |
| --- | --- | --- |
| **Plaintes pour violation de propriété intellectuelle** | Du texte, du code ou des images générés reproduisent une œuvre protégée | Vérifier les licences des modèles et les conditions d'indemnisation, filtrer les sorties, relire avant publication |
| **Résultats biaisés des modèles** | Un assistant de présélection classe les candidats différemment selon le genre | Données représentatives, évaluation des biais, revue humaine des décisions |
| **Perte de confiance des clients** | Un assistant donne des réponses offensantes ou fausses en public | Guardrails, tests, transparence sur l'usage de l'IA |
| **Risques pour l'utilisateur final** | Un utilisateur agit sur la base d'un conseil médical ou financier erroné | Sujets refusés, avertissements, transfert à une personne |
| **Hallucinations** | Le modèle invente une politique, un prix ou une référence juridique | Ancrage par RAG, vérifications d'ancrage contextuel, validation des sorties |

<!-- section: dataset-characteristics | objectives: 4.1.5 -->
## Les caractéristiques des jeux de données responsables

- **Inclusivité** : les données représentent chaque groupe qui utilisera le système ou sera concerné par lui.
- **Diversité** : des sources, contextes, langues, formats et cas limites variés, pour que le modèle généralise.
- **Sources de données sélectionnées** : des sources fiables, documentées, utilisables légalement, nettoyées des erreurs, doublons et contenus toxiques.
- **Jeux de données équilibrés** : aucune classe ni aucun groupe fortement sous-représenté ; rééquilibrez (collecter davantage, rééchantillonner, pondérer) le cas échéant.

> **Piège d'examen.** Un modèle globalement performant mais médiocre pour un groupe a généralement un groupe sous-représenté dans ses données d'entraînement. La correction porte sur les données (plus représentatives, équilibrées), pas sur un modèle plus grand.

<!-- section: bias-variance | objectives: 4.1.6 -->
## Les effets du biais et de la variance

| | Biais élevé | Variance élevée |
| --- | --- | --- |
| **Ajustement** | **Sous-ajustement** (underfitting) : le modèle est trop simple pour saisir les schémas | **Surajustement** (overfitting) : le modèle mémorise les données d'entraînement, bruit compris |
| **Symptôme** | Faible exactitude sur les données d'entraînement et sur les nouvelles données | Très bon sur les données d'entraînement, mauvais sur les nouvelles données |
| **Corrections types** | Caractéristiques plus pertinentes, modèle plus complexe, entraînement plus long | Plus de données et plus diverses, modèle plus simple, régularisation, arrêt anticipé |

- L'objectif est un équilibre entre les deux (le compromis biais-variance).
- **Effets sur les groupes démographiques** : un modèle entraîné sur des données non représentatives est imprécis pour les groupes sous-représentés ; en matière de crédit, de recrutement ou de santé, cette imprécision devient un traitement inéquitable, voire illégal.

<!-- section: bias-detection | objectives: 4.1.7 -->
## Détecter et surveiller les biais, la fiabilité et la véracité

| Technique | Ce qu'elle révèle |
| --- | --- |
| **Analyse de la qualité des étiquettes** | Des étiquettes fausses ou incohérentes, ou qui reproduisent des biais humains passés |
| **Audits humains** | Des réviseurs contrôlent des échantillons de sorties et de décisions pour l'équité, l'exactitude et les préjudices |
| **Analyse de sous-groupes** | Des métriques (exactitude, taux d'erreur, taux d'acceptation) comparées groupe par groupe pour trouver les écarts |
| **Surveillance continue** | Les changements des données et de la qualité après le déploiement (dérive) |

Outils AWS :

- **Amazon SageMaker Clarify** calcule des métriques de biais avant et après l'entraînement et des attributions de caractéristiques SHAP, et **Amazon SageMaker Model Monitor** détecte la dérive de la qualité des données, de la qualité du modèle et des biais sur les points de terminaison. Tous deux ne sont plus ouverts aux nouveaux clients depuis le 30 juillet 2026 ; les clients existants peuvent continuer à les utiliser.
- Pour les nouveaux projets, AWS recommande la bibliothèque open source `shap` et des formules de biais calculées avec des bibliothèques standard, la bibliothèque `fmeval` ou les évaluations Amazon Bedrock pour les FM, Amazon Bedrock Guardrails pour le filtrage de la toxicité et des PII à l'exécution, et Amazon CloudWatch ou les solutions de surveillance publiées par AWS pour la dérive.
- Les tâches d'évaluation humaine d'Amazon Bedrock permettent des audits humains des sorties d'IA générative, et les évaluations LLM-as-a-judge notent les stéréotypes, la nocivité et la fidélité.

> **Piège d'examen.** Les évaluations Bedrock ne couvrent que les modèles de fondation ; elles ne calculent pas les métriques de biais d'un modèle de ML classique sur données tabulaires. Ne choisissez jamais un service fermé aux nouveaux clients comme réponse pour un nouveau projet.

<!-- section: key-points -->
## Points clés

- Dimensions : équité, explicabilité, confidentialité et sécurité, sûreté, contrôlabilité, véracité et robustesse, gouvernance, transparence.
- Amazon Bedrock Guardrails : filtres de contenu, sujets refusés, filtres de mots, filtres de PII, ancrage contextuel, Automated Reasoning ; aussi seul avec `ApplyGuardrail`.
- Sélection responsable : le plus petit modèle adéquat, réutilisation de modèles préentraînés, matériel et Région efficaces.
- Risques juridiques : propriété intellectuelle, biais, confiance, préjudice pour l'utilisateur final, hallucinations.
- Jeux de données : inclusifs, diversifiés, sélectionnés, équilibrés. Biais élevé = sous-ajustement ; variance élevée = surajustement.
- SageMaker Clarify et Model Monitor sont fermés aux nouveaux clients depuis le 30 juillet 2026.
