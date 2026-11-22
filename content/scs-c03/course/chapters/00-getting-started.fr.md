Le SCS-C03 est l'examen de spécialité des personnes qui sécurisent des charges de travail et des organisations AWS. Ses questions ne demandent pas ce qu'est un service ; elles décrivent une entreprise avec plusieurs comptes, une exigence de sécurité précise et un qualificatif, puis quatre configurations ou plus qui paraissent toutes raisonnables. Celle qui l'emporte est départagée par une clé de condition, un type de politique, une Région, une frontière de compte ou un changement de statut dans le catalogue AWS. Ce chapitre présente le format, une méthode de lecture des scénarios de sécurité, les règles d'évaluation et les statuts de services qui tranchent les réponses en novembre 2026, les services que l'examen oppose et un plan d'étude.

<!-- section: exam-format -->
## Le format de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Security – Specialty |
| Version de l'examen | SCS-C03, en service depuis le 2 décembre 2025 (le SCS-C02 a pris fin le 1er décembre 2025) ; guide d'examen version 1.0 du 26 mars 2026 |
| Durée | 170 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 750 pour réussir |
| Modèle de notation | Compensatoire : seul le total compte, aucun minimum par domaine |
| Prix et passage | 300 USD ; centre de test Pearson VUE ou en ligne sous surveillance |
| Langues | Anglais, japonais, coréen, portugais (Brésil), chinois simplifié, espagnol (Amérique latine) ; les trois dernières sont retirées après le 31 décembre 2026 ; pas de version française |
| Candidat visé | Trois à cinq ans d'expérience dans la sécurisation de charges de travail cloud |

| Domaine | Poids | Chapitres du cours |
| --- | --- | --- |
| Détection | 16 % | 11 à 13 |
| Réponse aux incidents | 14 % | 21 et 22 |
| Sécurité de l'infrastructure | 18 % | 31 à 33 |
| Gestion des identités et des accès | 20 % | 41 et 42 |
| Protection des données | 18 % | 51 à 53 |
| Fondamentaux de la sécurité et gouvernance | 14 % | 61 à 63 |

Par rapport au SCS-C02, les domaines détection et réponse aux incidents ont été reconstruits et le dernier domaine renommé. Le guide ajoute la validation des résultats, OCSF et Amazon Security Lake, les règles AWS WAF de tiers, les garde-fous (guardrails) de l'IA générative (avec l'OWASP Top 10 for LLM applications), le chiffrement entre les nœuds d'un cluster, les éléments de clé importés par opposition à ceux générés par AWS, le masquage des données, les clés et certificats multi-Régions. Il retire l'AWS Security Finding Format en tant que sujet, les pare-feu d'hôte, les bases de TCP/IP, Reachability Analyzer, les concepts TLS, les interfaces virtuelles Direct Connect et les sites web statiques S3. Amazon MWAA et AWS Payment Cryptography sont hors du périmètre, comme la conception d'algorithmes cryptographiques, l'analyse au niveau des paquets et l'entraînement de modèles de ML.

Le guide liste quatre types de réponses :

| Type | Forme | Notation |
| --- | --- | --- |
| Choix multiple | Quatre options, une seule correcte (environ quatre questions sur cinq) | Une bonne réponse |
| Réponse multiple | « Choose two. » avec cinq options ou « Choose three. » avec six | Toutes les sélections correctes, pas de points partiels |
| Classement (ordering) | Mettre trois à cinq étapes dans l'ordre (une procédure de réponse aux incidents ou de rotation de clés) | Tout dans le bon ordre |
| Association (matching) | Associer trois à sept éléments à des services ou à des contrôles | Toutes les associations correctes |

L'examen affiche des noms de services courts (« GuardDuty », « Security Hub ») ; la liste complète se trouve sous le bouton Help.

> **Conseil d'examen.** Vous disposez d'environ 2 minutes 37 secondes par question. Répondez à tout au premier passage, marquez les doutes et gardez 20 minutes pour y revenir : une question sans réponse vaut zéro, comme une réponse fausse. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire un scénario de sécurité

Un énoncé compte trois à huit phrases : une entreprise (« AnyCompany »), ses comptes et la structure de son organisation, ce qu'elle a déjà (un journal de suivi, une clé, une conception de VPC), une exigence de sécurité, un qualificatif, puis « Which solution will meet these requirements? ». Les options sont des configurations concrètes : une politique avec une condition, un paramètre de service, une règle EventBridge et sa cible.

1. Lisez d'abord la question et le qualificatif.
2. Notez la portée : un compte, une UO, toute l'organisation, les comptes existants et futurs, une Région ou toutes.
3. Notez qui doit ou ne doit pas avoir accès : un rôle, un principal de service, un autre compte, personne, administrateurs compris.
4. Éliminez les options qui accordent plus que nécessaire, agissent dans le mauvais compte ou la mauvaise Région, ou ne protègent que les nouvelles ressources alors que les existantes comptent.
5. Pour « Choose two » ou « Choose three », vérifiez que les options forment ensemble une chaîne qui fonctionne (par exemple détection, puis notification, puis correction).

| Mots de l'énoncé | Ce qu'ils sélectionnent en général |
| --- | --- |
| « least privilege » (moindre privilège) | Actions et ressources précises, clés de condition (`aws:PrincipalOrgID`, `aws:SourceVpce`, `aws:SourceArn`, `kms:ViaService`), pas de caractères génériques |
| « MOST secure » | Identifiants temporaires, connectivité privée, clés gérées par le client, garde-fous de refus, MFA |
| « LEAST operational overhead » | Un détecteur géré ou une fonctionnalité intégrée (GuardDuty, contrôles Security Hub, règles gérées, rotation automatique) plutôt qu'un outillage Lambda ou EC2 personnalisé |
| « automatically remediate » | Règle EventBridge ou correction Config qui démarre Systems Manager Automation, Lambda ou Step Functions |
| « including future accounts » | Administrateur délégué avec activation automatique, journaux de suivi d'organisation, SCP ou RCP sur la racine ou une UO, packs de conformité d'organisation |
| « prove » ou « audit evidence » | Enregistrements immuables : CloudTrail avec validation de l'intégrité, S3 Object Lock en mode conformité, historique Config |
| « no one, including the root user » | S3 Object Lock en mode conformité, SCP (qui restreignent bien l'utilisateur root d'un compte membre), éléments de clé hors d'AWS |
| « the company must control the keys » | Clés KMS gérées par le client, éléments de clé importés, magasins de clés CloudHSM ou externes, selon le degré de contrôle |

> **Piège d'examen.** Une mauvaise option de sécurité fonctionne souvent. Elle échoue sur un détail de portée : une SCP attachée au compte de gestion (les SCP ne l'affectent jamais), un détecteur GuardDuty activé dans une seule Région, une politique de clé qui autorise le rôle mais sans octroi (grant) pour le service, une politique de compartiment restreinte par `aws:SourceIp` alors que le trafic arrive par un point de terminaison de VPC (utilisez `aws:SourceVpce`).

<!-- section: decision-rules -->
## Les règles qui tranchent les réponses en 2026

**L'évaluation des politiques**, colonne vertébrale des domaines identités, données et gouvernance :

- Un `Deny` explicite dans n'importe quelle politique applicable l'emporte.
- Les SCP plafonnent ce que les principaux des comptes membres peuvent faire ; les RCP plafonnent ce qui peut être fait aux ressources des comptes membres. Aucune n'accorde quoi que ce soit, et aucune ne s'applique au compte de gestion.
- Dans un même compte, une autorisation dans une politique basée sur l'identité ou sur les ressources suffit, mais les limites d'autorisations et les politiques de session plafonnent le résultat : l'autorisation effective est l'intersection.
- Entre comptes, les deux côtés doivent autoriser : la politique d'identité de l'appelant et la politique de ressource (ou la politique d'approbation du rôle).
- Pour KMS, la politique de clé est la racine de l'accès : les politiques IAM ne fonctionnent que si la politique de clé autorise le compte à déléguer ; les octrois (grants) donnent un usage temporaire et restreint à un principal ou à un service.

**Rotation des clés** : la rotation automatique (annuelle par défaut) n'existe que pour les clés aux éléments générés par AWS (origine `AWS_KMS`) ; les éléments importés (`EXTERNAL`) prennent en charge la rotation à la demande et peuvent expirer ; les clés des magasins de clés CloudHSM ou externes ne tournent que manuellement.

**Statut des services en novembre 2026.** Certidrill n'en fait jamais la bonne réponse pour un nouveau déploiement :

| Service | Statut | Que choisir à la place |
| --- | --- | --- |
| Amazon CodeGuru Security | Arrêté le 20 novembre 2025 | Analyse des dépôts de code d'Amazon Inspector |
| Amazon Q Developer | Nouvelles inscriptions fermées depuis le 15 mai 2026 | Kiro |
| Protection des données des messages Amazon SNS | Fermée aux nouveaux clients depuis le 30 avril 2026 | Une fonction Lambda utilisant Amazon Bedrock Guardrails |
| AWS Audit Manager | Fermé aux nouveaux clients depuis le 30 avril 2026 | Packs de conformité Config, Security Hub CSPM, contrôles Control Tower |
| AWS CloudTrail Lake | Fermé aux nouveaux clients depuis le 31 mai 2026 | CloudWatch (la migration recommandée par AWS), ou des journaux de suivi interrogés avec Athena |
| Amazon Q Business, AWS Directory Service Simple AD | Fermés aux nouveaux clients depuis le 30 juillet 2026 | Pour les annuaires : AWS Managed Microsoft AD ou AD Connector |
| Systems Manager Incident Manager et Change Manager, vérification de préparation d'ARC (readiness check) | En maintenance : clients existants uniquement | Automatisation de la réponse avec EventBridge, Systems Manager Automation ou Step Functions |
| Coffres Amazon Glacier et Vault Lock | Fermés aux nouveaux clients | Classes de stockage S3 Glacier avec S3 Object Lock |

**Deux Security Hub.** Le service lancé en 2018 s'appelle désormais **AWS Security Hub CSPM** : normes, contrôles, résultats ASFF et intégrations de partenaires. Le nouvel **AWS Security Hub**, disponible depuis le 2 décembre 2025, corrèle les résultats de GuardDuty, Inspector, Macie et CSPM en expositions avec des chemins d'attaque, au format OCSF. Quand un énoncé demande des contrôles de conformité par rapport à une norme, la réponse est Security Hub CSPM ; pour des risques priorisés à travers les détecteurs, Security Hub. Amazon Detective, Macie, GuardDuty, Inspector et Security Lake restent pleinement ouverts.

<!-- section: confusing-pairs -->
## Les services que l'examen oppose

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Détection | GuardDuty, Inspector, Macie, Security Hub, Detective, Security Lake | Menaces à partir des journaux et de l'exécution ; vulnérabilités logicielles et accessibilité ; données sensibles dans S3 ; posture et expositions corrélées ; graphes d'investigation des causes racines ; stockage de journaux normalisés en OCSF |
| Périphérie et réseau | AWS WAF, Shield Advanced, Network Firewall, Firewall Manager | Règles de couche 7 sur CloudFront, ALB, API Gateway et d'autres ; protection DDoS avec équipe de réponse et protection des coûts ; inspection stateful du VPC avec des règles compatibles Suricata ; politiques centrales pour tous ces services dans l'organisation |
| Filtres de paquets | Groupes de sécurité, listes ACL réseau | Stateful, autorisations seulement, sur les ENI, peuvent référencer d'autres groupes ; stateless, autorisations et refus, sur les sous-réseaux, règles numérotées |
| Secrets | Secrets Manager, Parameter Store | Rotation intégrée, réplication entre Régions et politiques de ressources, coût par secret ; paramètres SecureString chiffrés avec KMS, sans rotation native, niveau standard sans frais supplémentaires |
| Certificats | ACM, AWS Private CA | Certificats gérés avec renouvellement automatique pour les services intégrés ; votre propre hiérarchie d'autorités de certification privées pour le TLS interne, le TLS mutuel, les appareils et les ancres d'approbation de Roles Anywhere |
| Identités | IAM Identity Center, Amazon Cognito, IAM Roles Anywhere | Authentification unique du personnel vers les comptes et les applications ; connexion des clients à vos applications, avec des groupes d'identités pour obtenir des identifiants AWS ; identifiants temporaires pour les charges de travail hors d'AWS grâce à des certificats X.509 |
| Accès distant | Verified Access, Client VPN, Session Manager | Accès aux applications évalué à chaque requête selon l'identité et la posture de l'appareil, sans VPN ; accès réseau à un VPC ; accès shell aux instances sans port entrant ni clé SSH |
| Garde-fous | SCP, RCP, limites d'autorisations | Plafond sur les principaux des comptes membres ; plafond sur les ressources des comptes membres, y compris l'accès par des principaux externes ; plafond sur un utilisateur ou un rôle |
| Immuabilité | Object Lock en mode gouvernance, Object Lock en mode conformité, conservation légale (legal hold) | Contournable avec `s3:BypassGovernanceRetention` ; personne ne peut raccourcir ni retirer la rétention, root compris ; pas de date de fin tant qu'elle n'est pas levée |
| Magasins de clés | KMS standard, magasin de clés CloudHSM, magasin de clés externe | HSM gérés par AWS avec rotation automatique ; votre cluster CloudHSM, rotation manuelle ; clés hors d'AWS, disponibilité et latence sous votre responsabilité |

<!-- section: study-plan -->
## Plan d'étude

1. Suivez les modules dans l'ordre : détection et réponse aux incidents d'abord, car les domaines suivants réutilisent leurs services (EventBridge, Systems Manager, CloudTrail).
2. Construisez une organisation de laboratoire : un compte de gestion, un compte d'outils de sécurité administrateur délégué de GuardDuty, Security Hub et Config, un compte d'archivage des journaux qui reçoit un journal de suivi d'organisation, et un compte de charge de travail. Ajoutez une SCP, une RCP et une clé KMS utilisée entre comptes. Supprimez tout ensuite.
3. Écrivez des politiques à la main jusqu'à prédire le résultat d'une évaluation : politique d'identité plus politique de ressource, rôle entre comptes avec ID externe, politique de clé plus octroi, politique de compartiment avec `aws:SourceVpce`.
4. Répétez deux runbooks de bout en bout : clé d'accès compromise (désactiver, révoquer les sessions, enquêter dans CloudTrail) et instance compromise (isoler, créer un instantané, enquêter dans un compte d'investigation numérique).
5. Après chaque module, passez un examen blanc ; pour chaque question, dites quelle exigence chaque mauvaise option ne respecte pas.
6. Réservez l'examen quand trois examens blancs complets de 65 questions d'affilée atteignent 800 ou plus en 170 minutes, sur des questions que vous n'avez jamais vues.
