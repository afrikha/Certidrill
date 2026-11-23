# DOP-C02 — doutes signalés par les agents sans fichier de rapport (23/11/2026)

Les premières tâches DOP-C02 ont reçu la consigne « n'écrire que les fichiers de la tâche » : leurs doutes, remontés dans le compte rendu final, sont regroupés ici.

- C-dop-c02-2 : chapitre 14 au-dessus de la longueur cible ; de mémoire : limites de stockage éphémère Fargate, limite de 10 000 de Distributed Map, 1 Go de CloudShell, « principal name sharing » de Service Catalog.
- C-dop-c02-3 : délai maximal Lambda de 1 800 s (vérifié depuis sur la page des quotas) ; non indiqué : frais inter-AZ du NLB cross-zone, délai de bascule des Multi-Region Access Points S3.
- C-dop-c02-4 : 5 filtres d'abonnement par groupe de journaux (vérifié, SOA-C03 chapitre 11 corrigé) ; la classe Infrequent Access de CloudWatch Logs est renommée Essentials ; non confirmés : side-car X-Ray sur ECS, configuration de collecte de traces de l'agent CloudWatch, `--unit` erroné laissant l'alarme en INSUFFICIENT_DATA.
- C-dop-c02-5 : de mémoire : detail-type EventBridge `Inspector2 Finding`, valeur par défaut d'un filtre de métrique avec dimensions, nouvelles tentatives Lambda asynchrones (2, 6 h), OpenSearch Ingestion depuis S3 via SQS, outils `inspector-sbomgen`/`ScanSbom`, limites SQS.
- C-dop-c02-6 : SCP 10 par cible et 10 240 caractères (RCP 5 et 5 120), certificats publics ACM 198 jours ; de mémoire : planifications Macie, ressources protégées par Shield Advanced, contrôles préventifs Control Tower par RCP, intervalles des règles Config périodiques.
- C-dop-c02-7 : non revérifiés : bandes de gravité GuardDuty, état de règle EventBridge pour les appels CloudTrail en lecture, événements Insights vers EventBridge ; politique de quarantaine nommée génériquement (V3 et V4 existent). Chapitre 63 : il manque la politique Organizations S3 Block Public Access et les règles de centralisation CloudWatch Logs (signalé par Q-dop-c02-6c).
- Q-dop-c02-1b, 1c, 1d, 2a, 2c, 3a, 3b, 3c, 4a : faits de mémoire listés dans leur compte rendu (ex. : `aws:PrincipalOrgID` dans une politique de dépôt CodeArtifact, `$Default` d'un groupe Auto Scaling, rétention de 24 h des DynamoDB Streams, Route 53 et politiques de routage homogènes, Elastic IP impossible sur un ALB, politique de rétention de compte CloudWatch Logs au 9 novembre 2026) ; à relire en priorité avec les rapports `Q-dop-c02-*.md` existants.
- Q-dop-c02-5b : Systems Manager Explorer sera déprécié le 31 décembre 2026 (non utilisé).
- Q-dop-c02-5a : EventBridge appelle désormais le bus personnalisé à règles « Custom Event Bus - Classic » ; le chapitre 51 ne le mentionne pas.
- Q-dop-c02-2b : la configuration centrale de Security Hub CSPM est désormais « legacy » (politiques déclaratives Organizations) ; une question le teste.
