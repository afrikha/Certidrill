Microsoft Defender pour le cloud vous indique si vos ressources cloud sont bien configurées et vous avertit quand l'une d'elles est attaquée. L'examen attend que vous distinguiez la gestion de la posture (CSPM) de la protection des charges de travail, et que vous sachiez comment les stratégies, les normes et les recommandations font évoluer le score de sécurité.

<!-- section: defender-for-cloud | objectives: 3.2.1 -->
## Microsoft Defender pour le cloud

**Microsoft Defender pour le cloud** (Defender for Cloud) est une **plateforme de protection des applications cloud natives (CNAPP)** : un seul service qui protège les applications cloud, du code jusqu'à la charge de travail en exécution. Il couvre les ressources dans **Azure**, dans d'autres clouds (**Amazon Web Services** et **Google Cloud Platform**) et les machines **locales**.

| Pilier | Ce qu'il fait |
| --- | --- |
| **DevSecOps** | Unifie la gestion de la sécurité au niveau du code dans des pipelines comme GitHub et Azure DevOps : résultats des analyses de code, de secrets et de dépendances au même endroit |
| **Gestion de la posture de sécurité cloud (CSPM)** | Évalue en continu la configuration des ressources et fait ressortir les actions qui évitent une violation |
| **Plateforme de protection des charges de travail cloud (CWPP)** | Protections propres aux serveurs, aux conteneurs, au stockage, aux bases de données et aux autres charges de travail, avec des alertes de sécurité quand une menace est détectée |

Defender pour le cloud découvre et protège aussi les charges de travail d'IA générative, et il est intégré au portail Microsoft Defender, où ses alertes rejoignent les incidents de Microsoft Defender XDR.

> **Piège d'examen.** Bien qu'il vive dans Azure, Defender pour le cloud ne se limite pas aux ressources Azure : c'est la réponse multicloud et hybride (Azure, AWS, GCP, local).

<!-- section: cspm | objectives: 3.2.2 -->
## Gestion de la posture de sécurité cloud

La **gestion de la posture de sécurité cloud (CSPM)** trouve les **configurations incorrectes** et les faiblesses avant un attaquant, et donne des conseils de renforcement. Son indicateur central est le **score de sécurité** (secure score) : Defender pour le cloud évalue vos ressources en continu et agrège les résultats en un score unique. **Plus le score est élevé, plus le risque identifié est faible.**

| | CSPM de base (Foundational CSPM) | Defender CSPM |
| --- | --- | --- |
| Coût | Gratuit, activé automatiquement sur les abonnements et comptes intégrés | Plan payant, facultatif |
| Inventaire des ressources, recommandations de sécurité, score de sécurité, benchmark de sécurité cloud Microsoft | Oui | Oui |
| Analyse du chemin d'attaque | Non | Oui |
| Explorateur de sécurité du cloud | Non | Oui |
| Analyse sans agent des machines virtuelles (vulnérabilités, secrets) | Non | Oui |
| Gouvernance : attribuer une recommandation à un propriétaire avec une échéance | Non | Oui |
| Gestion de la posture de sécurité des données (DSPM) | Non | Oui |
| Gestion de la posture de sécurité de l'IA | Non | Oui |
| Évaluations de conformité réglementaire | Non | Oui |

- L'**analyse du chemin d'attaque** modélise la façon dont un attaquant pourrait enchaîner des faiblesses pour atteindre une ressource de grande valeur, par exemple d'une machine virtuelle exposée à Internet jusqu'à un compte de stockage qui contient des données sensibles.
- L'**explorateur de sécurité du cloud** exécute des requêtes basées sur un graphe pour rechercher les risques de façon proactive.
- La **DSPM** découvre les magasins de données qui contiennent des données sensibles et évalue leur exposition.

<!-- section: policies-standards-recommendations | objectives: 3.2.3 -->
## Stratégies de sécurité, normes et recommandations

La posture s'améliore par un cycle continu : les stratégies définissent les règles, les normes les regroupent, les recommandations guident les corrections.

| Élément | Rôle |
| --- | --- |
| **Stratégie de sécurité** | Une règle sur une condition de sécurité que vous voulez contrôler. Les stratégies de Defender pour le cloud reposent sur **Azure Policy** |
| **Norme de sécurité** | Un ensemble de contrôles et de règles par rapport auxquels les ressources sont évaluées. Trois sortes : benchmarks de sécurité, normes de conformité réglementaire, normes personnalisées |
| **Benchmark de sécurité cloud Microsoft (MCSB)** | La norme par défaut, appliquée automatiquement quand Defender pour le cloud est activé. Des recommandations rédigées par Microsoft pour Azure et le multicloud, fondées sur les contrôles du CIS et du NIST |
| **Recommandation de sécurité** | Produite quand une ressource ne respecte pas un contrôle : description du problème, étapes de correction, ressources concernées, gravité |
| **Tableau de bord de conformité réglementaire** | Pour chaque norme appliquée, montre chaque contrôle et combien de ressources le réussissent ou y échouent |

Des normes réglementaires comme ISO 27001, SOC 2, NIST SP 800-53 et PCI DSS peuvent être ajoutées à côté du MCSB, et une même recommandation améliore souvent la conformité à plusieurs normes à la fois.

Les recommandations sont regroupées en **contrôles de sécurité**. Les corriger fait monter le score de sécurité. Seules les recommandations intégrées du MCSB comptent dans le score ; les recommandations signalées en préversion n'y comptent pas.

> **Piège d'examen.** Trois scores, trois produits. **Score de sécurité** dans Defender pour le cloud : posture des ressources cloud. **Degré de sécurisation Microsoft** (Microsoft Secure Score) dans le portail Microsoft Defender : posture des identités, des appareils et des applications Microsoft 365. **Score de conformité** dans le Gestionnaire de conformité : avancement des actions d'amélioration réglementaires.

<!-- section: cloud-workload-protection | objectives: 3.2.4 -->
## Protection des charges de travail cloud

La **protection des charges de travail cloud** détecte les menaces qui visent les ressources, les charges de travail et les services, et aide à les résoudre. Elle est fournie par des **plans Defender** payants, activés par type de ressource ; plusieurs plans peuvent fonctionner en même temps. Quand un plan détecte une menace, il émet une **alerte de sécurité** qui indique la nature et la gravité de l'attaque.

| Plan | Protège |
| --- | --- |
| **Defender for Servers** | Les machines Windows et Linux ; inclut Microsoft Defender pour point de terminaison pour la détection et la réponse des points de terminaison |
| **Defender for Containers** | Les clusters Kubernetes et les registres de conteneurs : renforcement, évaluation des vulnérabilités, détection des menaces à l'exécution |
| **Defender for Storage** | Les comptes de stockage, contre les activités potentiellement dangereuses |
| **Defender for Databases** | Azure SQL, les serveurs SQL sur des machines, les bases de données relationnelles open source, Azure Cosmos DB |
| **Defender for App Service** | Les applications exécutées sur App Service |
| **Defender for Key Vault** | Les coffres de clés (protection avancée contre les menaces pour Azure Key Vault) |
| **Defender for Resource Manager** | Les opérations de gestion des ressources de l'organisation |
| **Defender for APIs** | Les API critiques pour l'activité |
| **Defender for AI Services** | Les charges de travail d'IA générative, contre l'injection d'invites, la fuite de données et le vol d'informations d'identification |

Fonctionnalités de sécurité améliorées apportées par les plans :

- **Détection et réponse des points de terminaison (EDR)** et **analyse des vulnérabilités** des machines virtuelles, des registres de conteneurs et des ressources SQL.
- **Sécurité multicloud et hybride** : les mêmes protections pour les comptes AWS et GCP connectés et pour les machines locales.
- **Alertes de protection contre les menaces** pour les réseaux, les machines et les services cloud, enrichies par le renseignement sur les menaces.
- **Contrôles d'accès et d'application**, dont l'**accès juste-à-temps** aux ports de gestion des machines virtuelles, qui réduit l'exposition aux attaques par force brute.

| Besoin | Réponse |
| --- | --- |
| Trouver les ressources mal configurées et obtenir des conseils de renforcement | CSPM : recommandations et score de sécurité |
| Être alerté quand une machine virtuelle, une base de données ou un compte de stockage est attaqué | Protection des charges de travail cloud : un plan Defender |
| Montrer où en est l'environnement par rapport à PCI DSS ou ISO 27001 | Tableau de bord de conformité réglementaire |
| Voir quel chemin un attaquant pourrait emprunter jusqu'à des données sensibles | Analyse du chemin d'attaque (Defender CSPM) |
| Consulter les résultats de sécurité des dépôts de code et des pipelines | DevSecOps (sécurité DevOps) |

> **Piège d'examen.** La CSPM **prévient** : elle évalue la configuration et produit des recommandations. La protection des charges de travail cloud **détecte et répond** : elle surveille les charges de travail en exécution et produit des alertes.

<!-- section: key-points -->
## Points clés

- Defender pour le cloud est une CNAPP à trois piliers : DevSecOps, CSPM, CWPP. Il couvre Azure, AWS, GCP et le local.
- CSPM : évaluation continue, recommandations, score de sécurité (plus il est élevé, mieux c'est). Le CSPM de base est gratuit ; Defender CSPM ajoute l'analyse du chemin d'attaque, l'explorateur de sécurité du cloud, l'analyse sans agent, la gouvernance et la DSPM.
- Les stratégies (Azure Policy) sont regroupées en normes ; le MCSB est la norme par défaut ; une ressource non conforme produit une recommandation.
- Le tableau de bord de conformité réglementaire montre l'état par rapport à chaque norme, contrôle par contrôle.
- Protection des charges de travail cloud : des plans Defender payants par type de ressource (Servers, Containers, Storage, Databases, App Service, Key Vault, Resource Manager, APIs, AI Services) qui émettent des alertes de sécurité.
- Defender for Servers inclut Microsoft Defender pour point de terminaison.
