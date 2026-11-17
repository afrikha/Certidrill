Microsoft Sentinel est un SIEM qui s'exécute sur un espace de travail Log Analytics et qui s'utilise désormais depuis le portail Microsoft Defender. Ce chapitre couvre ce que l'examen demande sur ses fondations : l'activer sur le bon espace de travail et connecter cet espace au portail Defender, choisir le rôle le moins privilégié pour chaque tâche, installer du contenu depuis le hub de contenu, automatiser le traitement des incidents avec des règles d'automatisation et des playbooks, et fixer la durée de conservation des données dans le niveau d'analyse (analytics) et dans le data lake.

<!-- section: workspace | objectives: 4.2.1 -->
## Créer et connecter un espace de travail Microsoft Sentinel

Microsoft Sentinel s'ajoute **à un espace de travail Log Analytics** : l'espace de travail stocke les données, Sentinel ajoute par-dessus les fonctionnalités SIEM. Exigences et contraintes :

| Élément | Règle |
| --- | --- |
| Autorisation pour activer Sentinel | Contributor sur l'abonnement qui contient l'espace de travail |
| Autorisation pour utiliser Sentinel | Microsoft Sentinel Reader ou Microsoft Sentinel Contributor sur le groupe de ressources de l'espace de travail |
| Niveau tarifaire | Paiement à l'utilisation ou niveau d'engagement. Les niveaux tarifaires hérités ne sont pas pris en charge |
| Verrou de ressource | Non pris en charge sur l'espace de travail au moment d'activer Sentinel |
| Périmètre de sécurité réseau | Non pris en charge. S'il est activé, les règles d'analyse sont désactivées automatiquement |
| Espace de travail créé par Defender for Cloud (espace par défaut) | Non proposé : Sentinel ne peut pas y être installé |
| Déplacement de l'espace de travail | Non pris en charge une fois Sentinel déployé (pas de déplacement vers un autre groupe de ressources ou abonnement) |
| Isolation des données | Sentinel peut s'exécuter sur plusieurs espaces de travail, mais les données restent isolées par espace |

Microsoft recommande un **groupe de ressources dédié** qui ne contient que l'espace de travail Sentinel et ses ressources associées (playbooks, classeurs) : les autorisations s'attribuent alors une seule fois, au groupe de ressources, et s'appliquent à tout ce qu'utilise Sentinel. Des groupes de ressources supplémentaires peuvent héberger les ressources réservées à des groupes plus privilégiés.

Étapes d'activation : recherchez **Microsoft Sentinel**, sélectionnez **Créer**, puis soit **Créer un espace de travail** (abonnement, groupe de ressources, nom, région), soit sélectionnez un espace existant et **Ajouter**. Installez ensuite une solution depuis le hub de contenu (par exemple **Azure Activity**) et configurez son connecteur de données.

**Le portail Defender.** Après le **31 mars 2027**, Microsoft Sentinel n'est plus pris en charge dans le portail Azure et n'est disponible que dans le portail Defender. Les clients qui s'intègrent après le 1er juillet 2025 sont, dans de nombreux cas, intégrés automatiquement au portail Defender. Pour connecter un espace de travail existant : portail Defender > **Système** > **Paramètres** > **Microsoft Sentinel** > **Connecter un espace de travail**, sélectionnez les espaces, choisissez l'**espace de travail principal**, puis **Connecter**.

| Règle du portail Defender | Détail |
| --- | --- |
| Espaces de travail par locataire | Un espace principal et un nombre illimité d'espaces secondaires, dans un seul locataire Microsoft Entra |
| Corrélation Defender XDR | Uniquement l'espace principal : ses alertes sont corrélées avec les données Defender XDR dans la file d'incidents unifiée, et les incidents et alertes Defender XDR y sont synchronisés |
| Espaces secondaires | Leurs incidents ne contiennent que leurs propres données ; les détections personnalisées et les requêtes par API du repérage avancé sont limitées à l'espace principal |
| Changer d'espace principal | **Système** > **Paramètres** > **Microsoft Sentinel** > **Espaces de travail** ; le connecteur Defender XDR passe automatiquement au nouvel espace principal |
| Intégrer l'espace principal ou le changer | Security Administrator Microsoft Entra, plus Owner (attribution inconditionnelle sur l'abonnement) ou User Access Administrator + Microsoft Sentinel Contributor |
| Connecter ou déconnecter un espace secondaire | Owner, ou User Access Administrator + Microsoft Sentinel Contributor |
| Inter-locataires | GDAP avec Azure Lighthouse n'est pas pris en charge pour les données Sentinel dans le portail Defender ; utilisez Microsoft Entra B2B |

> **Piège d'examen.** Un utilisateur Owner de l'abonnement mais sans rôle Microsoft Entra ne peut pas intégrer l'espace principal : le rôle Security Administrator est aussi requis. Contributor seul ne suffit pas non plus, car l'intégration demande Owner ou User Access Administrator.

<!-- section: roles | objectives: 4.2.2 -->
## Attribuer des rôles dans Microsoft Sentinel

Microsoft Sentinel utilise des rôles Azure RBAC, à attribuer de préférence **au groupe de ressources** qui contient l'espace de travail. Si vous les attribuez plutôt à l'espace de travail, vous devez aussi les attribuer sur la ressource de solution SecurityInsights de cet espace. Les attributions sont cumulatives.

| Rôle | Permet |
| --- | --- |
| Microsoft Sentinel Reader | Consulter les données, incidents, classeurs et autres ressources Sentinel |
| Microsoft Sentinel Responder | Les autorisations de Reader plus la gestion des incidents (attribuer, changer le statut) |
| Microsoft Sentinel Contributor | Les autorisations de Responder plus créer et modifier règles d'analyse, classeurs et autres ressources, installer et mettre à jour les solutions du hub de contenu |
| Microsoft Sentinel Playbook Operator | Lister, consulter et exécuter manuellement des playbooks |
| Microsoft Sentinel Automation Contributor | Permet à Microsoft Sentinel d'ajouter des playbooks aux règles d'automatisation. Pas pour des comptes d'utilisateurs |

Rôles associés qui apparaissent dans les scénarios d'examen :

| Exigence | Rôle |
| --- | --- |
| Créer et modifier des playbooks (applications logiques Consumption) | Logic App Contributor |
| Créer ou supprimer des classeurs | Microsoft Sentinel Contributor (ou un rôle Sentinel inférieur) + Workbook Contributor |
| Utilisateur invité qui doit attribuer des incidents | Microsoft Sentinel Responder + Directory Reader (rôle Microsoft Entra) |
| Connecter une source de données | Autorisation d'écriture sur l'espace de travail, plus ce qu'indique la page du connecteur |
| Accorder à Sentinel l'autorisation d'exécuter les playbooks d'un groupe de ressources | Owner (ou User Access Administrator) sur ce groupe de ressources |
| Lire le data lake Sentinel pour tous les espaces de travail | Un rôle Microsoft Entra comme Security Reader, Security Operator, Security Administrator ou Global Reader |
| Écrire dans les tables du data lake, gérer les travaux du data lake | Security Operator ou Security Administrator (Microsoft Entra) |

> **Piège d'examen.** Microsoft Sentinel Responder permet à un analyste d'ouvrir l'incident, mais pas d'y exécuter un playbook : l'exécution manuelle d'un playbook demande Microsoft Sentinel Playbook Operator. Attacher un playbook à une règle d'automatisation ou d'analyse demande Microsoft Sentinel Contributor.

Owner, Contributor et Reader sur le groupe de ressources donnent aussi accès à Sentinel, de façon beaucoup plus large : évitez-les pour les analystes. Pour une séparation plus fine, utilisez le RBAC dans le contexte de la ressource ou le RBAC au niveau de la table sur l'espace de travail.

<!-- section: content-hub | objectives: 4.2.3 -->
## Solutions du hub de contenu

Le **hub de contenu** fournit du contenu prêt à l'emploi soit sous forme de **solutions** (packages de connecteurs de données, modèles de règles d'analyse, requêtes de repérage, classeurs, analyseurs et modèles de playbooks pour un produit ou un scénario), soit sous forme d'éléments de **contenu autonome**.

| Action | Comment |
| --- | --- |
| Installer une solution | Sélectionnez-la > **Afficher les détails** > **Créer** (ou **Mettre à jour**) ; choisissez abonnement, groupe de ressources et espace de travail ; **Vérifier + créer** |
| L'installer avec les connecteurs requis | **Installer avec les dépendances** |
| Installer ou mettre à jour en bloc | Vue liste, sélectionnez les éléments, **Installer/Mettre à jour** |
| Déployer en tant que code | **Télécharger un modèle pour l'automatisation** |
| Voir le contenu d'une solution | **Gérer** sur sa page de détails |
| Repérer les mises à jour | **Mettre à jour** dans la colonne de statut et le compteur **Mises à jour** |
| Rôle requis | Microsoft Sentinel Contributor sur le groupe de ressources |

Installer une solution ajoute des **modèles**, pas du contenu actif. Il faut encore agir sur chaque élément :

| Type de contenu | Ce qui l'active |
| --- | --- |
| Connecteur de données | Terminer les étapes de configuration du connecteur ; le statut passe à **Connecté** quand les données arrivent |
| Modèle de règle d'analyse | **Ouvrir** > **Créer une règle** depuis la galerie de modèles ; une règle existante se modifie depuis son lien de règle active |
| Modèle de classeur | **Afficher le modèle**, puis **Enregistrer** pour créer une instance |
| Requête de repérage | **Exécuter la requête**, ou la cloner pour la personnaliser |
| Analyseur | Ajouté automatiquement comme fonction de l'espace de travail |
| Modèle de playbook | **Créer un playbook** |

> **Piège d'examen.** Pour utiliser un seul élément d'une solution, il faut installer toute la solution. Mettre à jour une solution met à jour ses modèles : les règles déjà créées à partir d'un ancien modèle restent inchangées tant que vous ne les modifiez pas.

La zone de support de chaque élément indique qui le prend en charge : Microsoft ou le partenaire qui le publie.

<!-- section: automation | objectives: 4.2.8 -->
## Règles d'automatisation et playbooks

Les **règles d'automatisation** traitent les incidents de façon centralisée et sans code. Les **playbooks** sont des workflows Azure Logic Apps pour les réponses en plusieurs étapes et les appels à des systèmes externes ; les règles d'automatisation les exécutent.

| Élément d'une règle d'automatisation | Valeurs |
| --- | --- |
| Déclencheur | **Quand un incident est créé**, **Quand un incident est mis à jour**, **Quand une alerte est créée** (alertes des règles planifiées et NRT) |
| Conditions | Propriétés de l'incident avec des opérateurs comme égal à, contient, commence par ; en mise à jour : modifié, modifié de, modifié en, ajouté ; **Mis à jour par**. Le déclencheur d'alerte n'accepte que les règles d'analyse comme condition |
| Actions | Exécuter un playbook, changer le statut (motif et commentaire de clôture), changer la gravité, attribuer un propriétaire, ajouter des étiquettes, ajouter une tâche |
| Ordre | Les règles s'exécutent séquentiellement selon leur numéro d'**ordre** ; les actions s'exécutent dans l'ordre listé. Les règles du déclencheur de création passent avant celles du déclencheur de mise à jour |
| Expiration | Date facultative après laquelle la règle est désactivée, par exemple pendant un test d'intrusion |

| Exigence | Réponse |
| --- | --- |
| Attribuer chaque incident de gravité élevée à l'équipe de niveau 2, sans code | Règle d'automatisation, déclencheur de création d'incident, attribution du propriétaire |
| Supprimer les incidents pendant un test planifié | Règle d'automatisation qui les ferme, avec une date d'expiration |
| Ouvrir un ticket dans un outil ITSM et publier dans Teams | Playbook, exécuté par une règle d'automatisation |
| Exécuter un playbook à la demande sur une alerte ou une entité | Exécution manuelle (Playbook Operator) |
| Appliquer une même réponse à de nombreuses règles d'analyse | Une règle d'automatisation dont la condition liste ces règles |

Règles des playbooks à retenir :

- Le connecteur Microsoft Sentinel de Logic Apps propose un déclencheur d'**incident** (l'incident avec ses alertes et entités), un déclencheur d'**alerte** et un déclencheur d'**entité**. Les playbooks à déclencheur d'incident ne s'exécutent que depuis des règles d'automatisation à déclencheur d'incident, ceux à déclencheur d'alerte que depuis des règles à déclencheur d'alerte.
- Les applications logiques **Consumption** et **Standard** sont prises en charge. Avec Standard : pas de modèles de playbooks (créez le workflow manuellement), pas de workflows sans état, et une stratégie de restriction d'accès est nécessaire pour les points de terminaison privés.
- Le playbook s'authentifie auprès de Sentinel avec une **identité managée**, un principal de service ou un utilisateur Microsoft Entra. Pour l'identité managée, attribuez **Microsoft Sentinel Responder** sur l'espace de travail si le playbook met à jour des incidents ou des listes de surveillance, **Microsoft Sentinel Reader** s'il ne fait que recevoir des incidents.
- Les règles d'automatisation exécutent les playbooks au moyen d'un **compte de service** Microsoft Sentinel, qui a besoin de **Microsoft Sentinel Automation Contributor** sur le groupe de ressources du playbook (**Gérer les autorisations des playbooks**). Ensuite, n'importe quelle règle d'automatisation peut exécuter n'importe quel playbook de ce groupe.

> **Piège d'examen.** Le playbook apparaît dans la règle d'automatisation mais ne s'exécute pas : le compte de service Sentinel n'a pas reçu d'autorisations sur le groupe de ressources du playbook. Donner plus de rôles à l'analyste ne règle rien.

Pour un espace de travail intégré au portail Defender, la création des incidents a lieu dans le portail Defender : les règles de création d'incidents de Sentinel doivent être désactivées, et les modifications apportées à un même incident en 5 à 10 minutes sont envoyées en une seule mise à jour. Les règles d'automatisation s'exportent en modèles ARM pour être réutilisées dans d'autres espaces de travail.

<!-- section: retention | objectives: 4.2.9 -->
## Rétention des données dans les magasins de données Microsoft Sentinel

Les données Sentinel résident dans deux niveaux :

| Niveau | Usage | Rétention |
| --- | --- | --- |
| Niveau d'analyse (analytics) | Règles d'analyse, repérage, classeurs, playbooks, requêtes rapides | 30 jours par défaut pour l'espace de travail ; **90 jours gratuits** pour les tables Sentinel ; jusqu'à **2 ans (730 jours)** avec un coût supplémentaire |
| Niveau data lake | Stockage à faible coût des données volumineuses ou secondaires ; travaux KQL, notebooks, travaux de recherche, règles de synthèse | Jusqu'à **12 ans** de rétention totale |

Chaque table a deux paramètres : la **rétention d'analyse** et la **rétention totale**. L'écart entre les deux est la rétention à long terme. Dans le portail Defender, réglez-les dans **Données et connecteurs** > **Tables** ; dans le portail Azure, sur la page **Tables** de l'espace de travail.

| Règle | Détail |
| --- | --- |
| Rétention totale | Jusqu'à 12 ans (4 383 jours) pour tous les plans de table |
| Plan Basic | Fenêtre de requête fixe de 30 jours ; seule la rétention totale est configurable |
| Plan Auxiliary (data lake) | Interrogeable pendant toute la rétention totale ; seule la rétention totale est configurable |
| Réduire la rétention d'analyse | Immédiat ; le reste de la rétention totale devient de la rétention à long terme |
| Réduire la rétention totale | Les données sont supprimées après un délai de 30 jours, ce qui permet d'annuler la modification |
| Intégration au data lake | Les données du niveau d'analyse sont aussi disponibles dans le data lake à partir de ce moment, sans frais supplémentaires |
| Données uniquement dans le lake | Pas de règles d'analyse, de requêtes de repérage, de classeurs ni de playbooks dessus ; des travaux KQL peuvent les promouvoir vers le niveau d'analyse |
| Données à long terme d'une table Analytics | Travail de recherche (résultats dans une table `_SRCH`) ou restauration (table `_RST`) |

```bash
# Keep SecurityEvent 180 days in the analytics tier and 2 years in total
az monitor log-analytics workspace table update \
  --resource-group rg-sentinel --workspace-name law-contoso-sec \
  --name SecurityEvent --retention-time 180 --total-retention-time 730
```

> **Piège d'examen.** Augmenter la rétention d'analyse pour conserver des journaux d'audit est la réponse coûteuse. Quand l'exigence est « conserver sept ans au moindre coût, interroger occasionnellement », gardez une rétention d'analyse courte et une rétention totale longue.

<!-- section: key-points -->
## Points clés

- Sentinel s'active sur un espace de travail Log Analytics (Contributor sur l'abonnement) ; pas de niveau tarifaire hérité, pas de verrou, pas de déplacement ensuite.
- Dans le portail Defender : un espace principal par locataire, corrélé avec Defender XDR ; Security Administrator plus Owner (ou User Access Administrator + Sentinel Contributor) pour l'intégrer.
- Reader consulte, Responder gère les incidents, Contributor crée du contenu et installe les solutions, Playbook Operator exécute manuellement les playbooks.
- Le hub de contenu installe des modèles ; on crée ensuite règles et classeurs à partir d'eux. Microsoft Sentinel Contributor sur le groupe de ressources.
- Règles d'automatisation : déclencheur, conditions, actions ordonnées, expiration facultative. Les playbooks exigent que le compte de service Sentinel ait Microsoft Sentinel Automation Contributor sur leur groupe de ressources.
- Niveau d'analyse : 90 jours gratuits, jusqu'à 2 ans ; rétention totale jusqu'à 12 ans dans le data lake.
