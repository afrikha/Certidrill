Passer à AWS est une transformation de l'entreprise autant qu'un projet technique. L'examen vous demande de reconnaître le Framework d'adoption du Cloud AWS (AWS CAF), ses résultats métier et ses perspectives, les ressources qu'AWS propose pour accompagner une migration, et la stratégie de migration adaptée à une application.

<!-- section: adoption-strategies | objectives: 1.3.1 -->
## Les stratégies d'adoption du cloud

L'AWS CAF décrit l'adoption du cloud comme un **parcours de transformation cloud** itératif en quatre phases :

| Phase | Ce qui se passe |
| --- | --- |
| **Envision** (envisager) | Montrer comment le cloud accélérera les résultats métier : identifier et prioriser les opportunités de transformation, reliées à des parties prenantes et à des résultats mesurables |
| **Align** (aligner) | Identifier les lacunes de capacités dans les six perspectives et les dépendances entre services, et définir des stratégies pour améliorer la préparation au cloud |
| **Launch** (lancer) | Livrer des initiatives pilotes en production et démontrer une valeur métier progressive ; tirer les leçons avant de passer à l'échelle |
| **Scale** (mettre à l'échelle) | Étendre les pilotes à l'échelle voulue et s'assurer que les bénéfices de l'investissement cloud sont obtenus et durables |

La transformation se fait dans quatre **domaines de transformation** : **Technology** (technologie : migrer et moderniser l'infrastructure, les applications et les données), **Process** (processus : numériser et automatiser les opérations métier), **Organization** (organisation : réorganiser les équipes autour des produits et des chaînes de valeur) et **Product** (produit : nouvelles propositions de valeur et nouveaux modèles de revenus). Une entreprise commence en général par la technologie et obtient les plus grands bénéfices quand les autres domaines suivent.

Pour une migration de grande ampleur, l'**AWS Migration Acceleration Program (MAP)** suit une démarche en trois phases : **assess** (évaluer : lacunes de préparation et modèle de coût total de possession), **mobilize** (mobiliser : combler les lacunes, construire les fondations, choisir les stratégies de migration) et **migrate and modernize** (migrer et moderniser), avec AWS Professional Services ou des partenaires AWS et des investissements financiers qui compensent une partie des coûts de migration.

<!-- section: caf-components | objectives: 1.3.3 -->
## Les composants de l'AWS CAF

L'AWS CAF s'appuie sur l'expérience et les bonnes pratiques d'AWS pour aider les organisations à **identifier et prioriser les opportunités de transformation, évaluer et améliorer leur préparation au cloud, et faire évoluer leur feuille de route de transformation**. Il nomme quatre **résultats métier** :

| Résultat métier | Ce qu'il signifie |
| --- | --- |
| **Réduction des risques métier** (reduced business risk) | Un profil de risque plus bas grâce à une meilleure fiabilité, de meilleures performances et une sécurité renforcée |
| **Amélioration des performances environnementales, sociales et de gouvernance [ESG]** | Des informations qui améliorent la durabilité et la transparence de l'entreprise |
| **Augmentation des revenus** (increased revenue) | Nouveaux produits et services, nouveaux clients, nouveaux segments de marché |
| **Augmentation de l'efficacité opérationnelle** (increased operational efficiency) | Coûts d'exploitation plus bas, productivité plus élevée, meilleure expérience des employés et des clients |

Il regroupe les **capacités fondamentales** dont une organisation a besoin en six **perspectives**, chacune avec ses parties prenantes habituelles :

| Perspective | Objet | Parties prenantes habituelles |
| --- | --- | --- |
| **Business** (activité) | Faire en sorte que les investissements cloud accélèrent la transformation numérique et les résultats métier | CEO, CFO, COO, CIO, CTO |
| **People** (personnes) | Faire le lien entre technologie et métier : culture, structure de l'organisation, leadership, compétences et changement | CIO, COO, CTO, directeur du cloud, responsables transverses |
| **Governance** (gouvernance) | Orchestrer les initiatives cloud, maximiser les bénéfices et réduire les risques liés à la transformation | Directeur de la transformation, CIO, CTO, CFO, directeur des données, directeur des risques |
| **Platform** (plateforme) | Construire une plateforme cloud hybride, évolutive et de niveau entreprise, moderniser les charges de travail et mettre en œuvre des solutions cloud natives | CTO, responsables technologiques, architectes, ingénieurs |
| **Security** (sécurité) | Assurer la confidentialité, l'intégrité et la disponibilité des données et des charges de travail cloud | CISO, directeur de la conformité, responsables de l'audit interne, architectes et ingénieurs sécurité |
| **Operations** (opérations) | Fournir les services cloud à un niveau qui répond aux besoins métier | Responsables de l'infrastructure et de l'exploitation, ingénieurs de fiabilité des sites (SRE), gestionnaires de services informatiques |

Les trois premières perspectives sont des **capacités métier** ; plateforme, sécurité et opérations sont des **capacités techniques**.

> **Piège d'examen.** Former le personnel et gérer le changement organisationnel relève de la perspective **People**, pas de Governance. Gérer le budget, les bénéfices et les risques du programme cloud relève de **Governance**. Construire la plateforme cloud et son architecture relève de **Platform**, alors que surveiller et exploiter les charges de travail au quotidien relève d'**Operations**.

<!-- section: migration-resources | objectives: 1.3.2 -->
## Les ressources du parcours de migration

| Besoin | Ressource |
| --- | --- |
| Construire une analyse de rentabilité (business case) : coûts AWS projetés à partir de l'inventaire et de l'utilisation sur site, licences comprises | **Migration Evaluator** |
| Découvrir les serveurs, planifier les vagues de migration et automatiser les migrations avec des agents d'IA (VMware, mainframe, .NET et Windows) | **AWS Transform** |
| Réhéberger sur Amazon EC2 des serveurs physiques, virtuels ou d'un autre cloud, par réplication continue au niveau bloc et avec une bascule courte | **AWS Transform MGN** (anciennement AWS Application Migration Service) |
| Migrer une base de données vers AWS, en une fois ou avec réplication continue | **AWS Database Migration Service (AWS DMS)** |
| Convertir le schéma d'une base de données vers un autre moteur | **DMS Schema Conversion** ou l'outil téléchargeable **AWS Schema Conversion Tool (AWS SCT)** |
| Copier des fichiers et des objets vers AWS par le réseau | **AWS DataSync** |
| Guides de migration pas à pas, modèles et stratégies rédigés par des experts AWS | **AWS Prescriptive Guidance** |
| Des experts pour planifier et mener la migration | **AWS Professional Services**, **partenaires AWS** spécialisés en migration |
| Méthode, formation et financement pour une migration de grande ampleur | **AWS Migration Acceleration Program (MAP)** |

> **Piège d'examen.** AWS Migration Hub (fermé aux nouveaux clients depuis le 7 novembre 2025) et AWS Application Discovery Service (fermé aux nouveaux clients) étaient les réponses classiques pour « suivre les migrations » et « découvrir les serveurs sur site ». Pour un nouveau client en 2026, la réponse est AWS Transform. AWS Snowball Edge n'est plus proposé aux nouveaux clients non plus.

<!-- section: migration-strategies | objectives: 1.3.4 -->
## Choisir une stratégie de migration

AWS utilise sept stratégies de migration, les **7 R** :

| Stratégie | Ce que vous faites | Exemple |
| --- | --- | --- |
| **Retire** (retirer) | Mettre hors service ou archiver une application devenue inutile | Une application que personne n'utilise, trouvée pendant la découverte |
| **Retain** (conserver) | Garder l'application dans l'environnement source, ou reporter sa migration | Une application mainframe, un investissement matériel récent, des contraintes de résidence des données |
| **Rehost** (réhéberger, « lift and shift ») | Déplacer l'application vers AWS sans aucune modification | Des serveurs répliqués vers des instances EC2 avec AWS Transform MGN |
| **Relocate** (relocaliser) | Déplacer des serveurs ou des ressources vers une version cloud de la plateforme, ou vers un autre VPC, une autre Région ou un autre compte, sans acheter de matériel ni réécrire l'application | Une instance de base de données Amazon RDS déplacée vers un autre VPC ou un autre compte AWS |
| **Repurchase** (racheter, « drop and shop ») | Remplacer l'application par un autre produit, en général un logiciel en tant que service (SaaS) | Un CRM sur site remplacé par un CRM SaaS |
| **Replatform** (changer de plateforme, « lift, tinker, and shift ») | Déplacer avec quelques optimisations, sans changer l'architecture de base | Une base SQL Server autogérée déplacée vers Amazon RDS for SQL Server |
| **Refactor** (refactoriser, réarchitecturer) | Modifier l'architecture pour utiliser des fonctionnalités cloud natives | Une application monolithique réécrite en microservices sur AWS Lambda |

La refactorisation est la stratégie la plus complexe et la plus coûteuse ; pour une migration de grande ampleur, AWS recommande de réhéberger, relocaliser ou changer de plateforme d'abord, puis de moderniser ensuite.

La **réplication des bases de données** est la méthode habituelle pour migrer une base avec une interruption minimale. AWS DMS copie les données existantes, puis **réplique les modifications en continu** pour garder la source et la cible synchronisées pendant que l'application continue d'utiliser la source ; la bascule vers la cible a lieu quand elles concordent. Une migration **homogène** garde le même moteur (MySQL vers Amazon RDS for MySQL) ; une migration **hétérogène** le change (Oracle vers Amazon Aurora PostgreSQL) et exige d'abord une conversion de schéma.

> **Conseil d'examen.** « Migrer le plus vite possible sans modifier le code » correspond à **rehost**. « Passer à un service de base de données géré sans modifier le code de l'application » correspond à **replatform**. « Réécrire pour utiliser des services sans serveur » correspond à **refactor**. « Passer à un produit SaaS » correspond à **repurchase**.

<!-- section: key-points -->
## Points clés

- Parcours AWS CAF : envision, align, launch, scale. Domaines de transformation : technologie, processus, organisation, produit.
- Résultats métier : réduction des risques métier, amélioration des performances ESG, augmentation des revenus, augmentation de l'efficacité opérationnelle.
- Six perspectives : business, people, governance (capacités métier) ; platform, security, operations (capacités techniques).
- Analyse de rentabilité : Migration Evaluator. Découverte et planification de migration pour les nouveaux clients : AWS Transform. Réhébergement : AWS Transform MGN. Bases de données : AWS DMS avec DMS Schema Conversion ou AWS SCT.
- 7 R : retire, retain, rehost, relocate, repurchase, replatform, refactor.
