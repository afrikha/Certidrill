L'AIF-C01 est un examen de base sur l'intelligence artificielle dans AWS. Chaque question vous demande de reconnaître une seule chose : un type d'apprentissage, une technique de ML, une métrique, une façon de personnaliser un modèle de fondation, un paramètre d'inférence, une pratique d'IA responsable ou le service AWS qui répond à un besoin. Vous n'écrivez jamais de code et ne construisez aucun pipeline : l'examen évalue quelqu'un qui utilise des solutions d'IA/de ML. Ce chapitre présente le format, une méthode de lecture, les familles à distinguer et un plan de travail.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified AI Practitioner |
| Guide d'examen | Version 1.2 du 29 octobre 2026 |
| Durée | 90 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 700 pour réussir |
| Modèle de notation | Compensatoire : seul le score total compte, il n'y a pas de seuil par domaine |
| Réponses fausses ou vides | Une question sans réponse compte comme fausse et il n'y a pas de pénalité pour une réponse au hasard : répondez toujours |
| Candidat visé | Jusqu'à six mois d'exposition aux technologies d'IA/de ML dans AWS ; utilise des solutions d'IA/de ML sans les construire |

Les cinq domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Principes fondamentaux de l'IA et du ML | 20 % |
| Principes fondamentaux de l'IA générative | 24 % |
| Applications des modèles de fondation | 28 % |
| Directives pour une IA responsable | 14 % |
| Sécurité, conformité et gouvernance pour les solutions d'IA | 14 % |

L'examen utilise quatre types de questions, tous notés en tout ou rien :

| Type | Ce que vous faites | Part (estimation) |
| --- | --- | --- |
| Choix multiple | Choisir la seule bonne réponse parmi quatre options | La grande majorité |
| Réponse multiple | Choisir deux bonnes réponses parmi cinq options (« Choose two. »), rarement trois parmi six | Environ une question sur sept |
| Classement (ordering) | Sélectionner trois à cinq réponses et les mettre dans le bon ordre pour accomplir une tâche, par exemple les étapes d'un pipeline de ML ou du cycle de vie d'un FM | Quelques questions |
| Association (matching) | Associer trois à sept propositions aux bonnes réponses, par exemple des cas d'utilisation à des services AWS | Quelques questions |

Il n'y a pas de laboratoire.

> **Conseil d'examen.** Une question de classement ou d'association partiellement juste ne rapporte rien. Placez d'abord les éléments dont vous êtes sûr, puis les autres par élimination. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire une question

Un énoncé compte une à quatre phrases : une entreprise (« A retail company », « A bank ») et un besoin, puis la question : « Which solution will meet these requirements? », « Which metric should the company use? », « Which type of learning is this? ». Les options viennent de la même famille : un détail de l'énoncé fait la différence. Procédez dans cet ordre :

1. Lisez d'abord la phrase de la question : choisissez-vous un concept, une technique, une métrique, un paramètre ou un service ?
2. Soulignez les mots clés du besoin et le qualificatif (« LEAST operational overhead », « MOST cost-effective », « without retraining the model »).
3. Éliminez les options qui font quelque chose de proche, mais de différent, puis celles qui ne respectent pas le qualificatif.
4. Pour « Choose two. », vérifiez chaque option séparément : chaque bonne option doit répondre seule à la question.

| Mots de l'énoncé | Ce qu'ils désignent |
| --- | --- |
| « predict a number » (prédire un nombre : prix, demande, température) | La régression |
| « assign a category », « fraud or not » (attribuer une catégorie, fraude ou non) | La classification |
| « group customers », « no labels » (regrouper des clients, sans étiquettes) | Le clustering (apprentissage non supervisé) |
| « use the company's current documents », « without retraining » (utiliser les documents actuels de l'entreprise, sans réentraînement) | Le RAG, par exemple Amazon Bedrock Knowledge Bases |
| « more consistent, less random answers » (réponses plus constantes, moins aléatoires) | Une température plus basse |
| « quality of generated summaries » (qualité des synthèses générées) | ROUGE |
| « quality of machine translation » (qualité de la traduction automatique) | BLEU |
| « block a topic », « mask personal data in prompts and responses » (bloquer un sujet, masquer les données personnelles des invites et des réponses) | Amazon Bedrock Guardrails |
| « document the intended use and risks of a model » (documenter l'usage prévu et les risques d'un modèle) | Amazon SageMaker Model Cards |
| « who invoked the model », « audit API calls » (qui a appelé le modèle, auditer les appels d'API) | AWS CloudTrail |

> **Piège d'examen.** « LEAST operational overhead » désigne l'option gérée : un service d'IA prêt à l'emploi ou Amazon Bedrock plutôt qu'un modèle que vous entraînez et hébergez dans SageMaker AI, l'ingénierie de requête ou le RAG plutôt que le peaufinage (fine-tuning).

<!-- section: confusing-pairs -->
## Les concepts et services faciles à confondre

Retenez la différence en une ligne entre les membres de chaque famille :

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Types d'apprentissage | Supervisé, non supervisé, par renforcement | Des exemples étiquetés ; des motifs dans des données non étiquetées ; un agent apprend à partir de récompenses |
| Techniques de ML | Classification, régression, clustering | Une catégorie ; un nombre ; des groupes trouvés sans étiquettes |
| Métriques de ML | Exactitude (accuracy), précision, rappel, score F1, AUC | Part des prédictions correctes ; combien de positifs signalés sont réels ; combien de positifs réels sont trouvés ; équilibre entre précision et rappel ; qualité du classement sur tous les seuils |
| Métriques d'IA générative | ROUGE, BLEU, BERTScore, LLM-as-a-judge | Synthèses ; traductions ; similarité sémantique avec une référence ; un modèle note les réponses d'un autre modèle |
| Personnalisation | Ingénierie de requête, RAG, peaufinage, préentraînement continu, distillation | De meilleures instructions ; des documents récupérés dans l'invite ; des exemples étiquetés modifient les poids ; des données de domaine non étiquetées ; un petit modèle élève apprend d'un grand modèle enseignant |
| Paramètres d'inférence | Température, top-p, top-k, longueur maximale | Caractère aléatoire ; part de la masse de probabilité prise en compte ; nombre de jetons candidats pris en compte ; longueur de la réponse |
| Tarification de Bedrock | À la demande, par lots, Provisioned Throughput | Paiement par jeton ; tâches asynchrones à prix réduit pour certains modèles ; unités de modèle réservées à l'heure |
| Construire avec l'IA | Amazon Bedrock, Amazon SageMaker AI, SageMaker JumpStart | Des modèles de fondation par une API ; construire, entraîner et héberger vos propres modèles ; un hub de modèles préentraînés à déployer et à peaufiner |
| Assistants et outils d'IA | Amazon Quick, Kiro, Strands Agents, Amazon Bedrock AgentCore | Informatique décisionnelle, recherche et automatisation fondées sur l'IA pour les utilisateurs métier ; environnement de développement agentique ; SDK open source pour coder des agents ; services pour déployer et exploiter des agents à grande échelle |
| Fonctionnalités de Bedrock | Guardrails, Knowledge Bases, Prompt Management, Model Evaluation | Protections sur les entrées et les sorties ; RAG géré ; invites versionnées ; comparer des modèles par des métriques ou des évaluateurs humains |
| Risques de l'IA générative | Hallucination, injection d'invite, débridage (jailbreaking), empoisonnement | Une sortie fluide mais fausse ; des instructions cachées dans l'entrée détournent le modèle ; des invites qui contournent les règles de sûreté ; des données d'entraînement corrompues |
| Gouvernance | AWS Config, AWS CloudTrail, AWS Artifact, Amazon Inspector, Amazon Macie | Configuration des ressources et conformité à des règles ; activité des API ; rapports de conformité d'AWS ; analyse des vulnérabilités ; découverte des données sensibles dans Amazon S3 |

AWS renomme et ferme des services, et certaines réponses classiques de l'examen sont concernées. Depuis le 30 juillet 2026, Amazon SageMaker Clarify, SageMaker Model Monitor, SageMaker Ground Truth, Amazon Augmented AI (A2I), SageMaker Debugger, Amazon Kendra, Amazon Q Business et Amazon Bedrock Agents (désormais Bedrock Agents Classic) sont fermés aux nouveaux clients. AWS oriente les clients de Q Business vers Amazon Quick et les créateurs d'agents vers Amazon Bedrock AgentCore ; Bedrock Knowledge Bases et Guardrails ne sont pas concernés. Amazon Q Developer n'accepte plus de nouvelles inscriptions depuis le 15 mai 2026 et la prise en charge de ses plug-ins d'IDE prend fin le 30 avril 2027 : Kiro est son successeur. Le guide d'examen écrit « Amazon Quick » ; la documentation AWS l'intitule désormais AWS Quick, issu d'Amazon QuickSight. Certidrill ne fait jamais d'un service fermé aux nouveaux clients la bonne réponse pour un nouveau projet.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le vocabulaire du premier module (types d'apprentissage, inférence, données, métriques) sert dans toutes les réponses suivantes.
2. Dans le terrain de jeu (playground) de la console Amazon Bedrock, envoyez la même invite avec une température basse puis élevée : les paramètres d'inférence deviennent concrets.
3. Pour chaque famille du tableau ci-dessus, écrivez de mémoire la différence en une ligne, puis comparez.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication, y compris les raisons pour lesquelles les mauvaises options échouent, et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.

<!-- section: key-points -->
## Points clés

- 90 minutes, 65 questions (dont 15 non notées), 700 sur 1 000 pour réussir, pas de minimum par domaine, pas de pénalité pour une réponse au hasard.
- Quatre types : choix multiple, réponse multiple, classement et association, tous notés en tout ou rien.
- Les applications des modèles de fondation (28 %) et les principes de l'IA générative (24 %) représentent environ la moitié de l'examen.
- Trouvez le mot clé et le qualificatif, puis éliminez les voisins de la même famille.
- Ne choisissez jamais un service fermé aux nouveaux clients, comme SageMaker Clarify, SageMaker Model Monitor ou Amazon Q Business, pour un nouveau projet.
