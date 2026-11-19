Un modèle de fondation (FM) se construit par étapes : un préentraînement très coûteux sur un immense corpus non étiqueté, puis une adaptation facultative avec beaucoup moins de données. L'examen décrit une exigence (ajouter le vocabulaire d'un domaine, suivre un format de l'entreprise, obtenir un modèle plus petit et moins cher, aligner les réponses sur les préférences humaines) et demande quelle méthode d'entraînement convient et de quelles données elle a besoin.

<!-- section: training-elements | objectives: 3.3.1 -->
## Les éléments clés de l'entraînement d'un FM

| Élément | Données | Ce qu'il change | Coût et effort |
| --- | --- | --- | --- |
| **Préentraînement (pre-training)** | Données massives non étiquetées (texte, code, images), apprises par auto-supervision, par exemple en prédisant le jeton suivant | Crée le modèle général et ses connaissances étendues | Le plus élevé : des mois de grands clusters d'accélérateurs ; réalisé par les fournisseurs de modèles |
| **Peaufinage (fine-tuning)** | Un jeu plus petit d'exemples **étiquetés** (invite et complétion attendue) | Ajuste les poids du modèle pour des tâches, des formats ou des styles précis | Modéré : tâche d'entraînement facturée aux jetons traités, plus le stockage du modèle personnalisé |
| **Préentraînement continu (continued pre-training)** | Grande quantité de texte de domaine **non étiqueté** (contrats, notes médicales, documents internes) | Étend les connaissances et le vocabulaire du modèle sur un domaine | Plus élevé que le peaufinage, bien moindre qu'un préentraînement à partir de zéro |
| **Distillation** | Des invites de votre cas d'usage ; un grand modèle **enseignant** (teacher) génère les réponses | Entraîne un modèle **élève** (student) plus petit pour approcher la qualité de l'enseignant sur ce cas d'usage | Coût d'entraînement une fois ; ensuite l'élève est plus rapide et moins cher à exécuter |

Sur AWS :

- **Amazon Bedrock** personnalise des modèles sans gérer d'infrastructure. Ses méthodes de personnalisation sont le peaufinage supervisé (données étiquetées), le **peaufinage par renforcement** (reinforcement fine-tuning : des invites ou des journaux d'invocation, plus des fonctions de récompense écrites dans AWS Lambda, sans paires étiquetées) et la **distillation** (réponses de l'enseignant générées à partir de vos invites ou reprises des journaux d'invocation). Le modèle personnalisé obtenu est privé à votre compte.
- **Amazon SageMaker AI** entraîne ou peaufine des modèles sur une infrastructure que vous configurez, y compris un entraînement à partir de zéro. **SageMaker JumpStart** propose des modèles préentraînés avec deux approches de peaufinage : l'adaptation au domaine sur votre texte propre au domaine, et le peaufinage par instructions sur des exemples d'invites et de réponses.
- L'entraînement dans Bedrock est facturé aux jetons traités (jetons des données d'entraînement × nombre d'époques), plus un stockage mensuel par modèle personnalisé. Pour utiliser le modèle personnalisé, vous achetez du **Provisioned Throughput** (débit provisionné, capacité dédiée) ou vous le déployez pour une inférence **à la demande**, là où elle est disponible.

> **Piège d'examen.** Le préentraînement à partir de zéro n'est presque jamais la réponse pour une entreprise : c'est l'option la plus chère. « Vocabulaire d'un domaine avec beaucoup de documents non étiquetés » = préentraînement continu ; « exemples étiquetés pour une tâche » = peaufinage ; « modèle plus petit, plus rapide, moins cher, avec une exactitude proche » = distillation.

<!-- section: fine-tuning-methods | objectives: 3.3.2 -->
## Les méthodes pour peaufiner un FM

| Méthode | Fonctionnement | Exigence typique |
| --- | --- | --- |
| **Réglage par instructions (instruction tuning)** | Peaufine sur des paires d'instructions et de réponses idéales | Le modèle doit suivre des instructions dans un format, un ton ou une politique donnés |
| **Adaptation au domaine (domain adaptation)** | Entraîne sur les données d'un secteur pour que le modèle maîtrise ses termes et ses schémas | Jargon juridique, médical, financier ou interne |
| **Apprentissage par transfert (transfer learning)** | Réutilise ce qu'un modèle préentraîné a appris et l'entraîne davantage sur une nouvelle tâche proche | Peu de données et de budget : partir d'un modèle préentraîné plutôt que de zéro |
| **Préentraînement continu** | Poursuit l'objectif de préentraînement sur de nouvelles données non étiquetées, de façon répétée à mesure que le domaine évolue | Tenir le modèle à jour avec un corpus de documents de domaine qui grandit |

- Tout peaufinage est une forme d'apprentissage par transfert : les connaissances générales du FM sont le point de départ.
- Le peaufinage modifie le modèle de façon permanente ; il convient à des connaissances ou à un comportement stables. Pour des faits qui changent souvent ou doivent être cités, le RAG est en général moins cher et plus à jour qu'un réentraînement.
- Le peaufinage peut faire oublier au modèle une partie de ses capacités générales ou le surajuster à un petit jeu de données ; gardez un jeu de validation et évaluez le modèle personnalisé par rapport au modèle de base.

> **Conseil d'examen.** Choisissez la méthode la plus légère qui répond au besoin : ingénierie de requête, puis RAG, puis peaufinage, puis préentraînement continu, puis préentraînement. Chaque étape ajoute du coût, des données et de l'effort.

<!-- section: fine-tuning-data | objectives: 3.3.3 -->
## Préparer les données pour peaufiner un FM

Les données de peaufinage d'Amazon Bedrock sont stockées dans Amazon S3 au format JSON Lines : un exemple par ligne. Pour une tâche de texte non conversationnelle, chaque ligne contient une invite et la complétion attendue :

```json
{"prompt": "Classify the ticket: My card was charged twice.", "completion": "Billing"}
{"prompt": "Classify the ticket: The app crashes when I log in.", "completion": "Technical"}
```

| Facteur | Bonne pratique |
| --- | --- |
| **Curation des données** | Supprimez les doublons, les erreurs, les exemples sans rapport ou de faible qualité ; la qualité compte plus que le volume |
| **Gouvernance** | N'utilisez que des données que vous avez le droit d'utiliser ; supprimez ou masquez les données personnelles ; consignez les sources, les propriétaires et les approbations ; contrôlez l'accès avec IAM et le chiffrement |
| **Taille** | Assez d'exemples pour couvrir la tâche, dans les limites du modèle ; plus d'exemples augmentent le coût d'entraînement (jetons × époques) |
| **Étiquetage** | Des étiquettes exactes et cohérentes, rédigées par des personnes qui connaissent le domaine, avec des consignes claires |
| **Représentativité** | Des exemples qui reflètent les entrées réelles, tous les groupes d'utilisateurs, les langues et les cas limites, pour éviter les biais |
| **Données de validation** | Un jeu séparé, non utilisé pour l'entraînement, pour mesurer le modèle personnalisé |

L'**apprentissage par renforcement à partir des commentaires humains (RLHF)** aligne un modèle sur les préférences humaines :

1. Des personnes rédigent des invites et des réponses de qualité, utilisées pour un peaufinage supervisé.
2. Des personnes classent plusieurs réponses à la même invite ; ces classements entraînent un **modèle de récompense** (reward model) qui prédit ce que les gens préfèrent.
3. Le FM est optimisé par apprentissage par renforcement pour produire des réponses que le modèle de récompense note bien.

Le peaufinage par renforcement de Bedrock suit la même idée avec des fonctions de récompense que vous définissez au lieu de classements humains.

> **Piège d'examen.** Amazon SageMaker Ground Truth et Amazon Augmented AI (A2I) ne sont plus ouverts aux nouveaux clients depuis le 30 juillet 2026 ; les clients existants peuvent continuer à les utiliser. Ne les choisissez pas comme outil d'étiquetage ou de revue humaine pour un nouveau projet.

<!-- section: key-points -->
## Points clés

- Préentraînement : non étiqueté, massif, le plus cher. Peaufinage : étiqueté, propre à une tâche. Préentraînement continu : données de domaine non étiquetées. Distillation : de l'enseignant vers l'élève, plus petit et moins cher.
- Personnalisation dans Amazon Bedrock : peaufinage supervisé, peaufinage par renforcement, distillation ; inférence avec Provisioned Throughput ou déploiement à la demande.
- Méthodes de peaufinage : réglage par instructions, adaptation au domaine, apprentissage par transfert, préentraînement continu.
- Données : sélectionnées, gouvernées, dimensionnées, étiquetées avec exactitude, représentatives, avec un jeu de validation ; paires invite et complétion en JSONL dans S3.
- RLHF : des classements humains entraînent un modèle de récompense qui oriente le FM.
