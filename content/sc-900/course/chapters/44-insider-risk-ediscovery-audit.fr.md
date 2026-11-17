Certains risques viennent de l'intérieur de l'organisation, et certaines questions viennent après coup : qu'a fait cet utilisateur, et où sont les preuves ? Trois solutions Microsoft Purview y répondent. L'examen attend que vous les distinguiez : la gestion des risques internes détecte les comportements à risque, eDiscovery trouve et préserve du contenu pour une affaire juridique, Audit enregistre qui a fait quoi.

<!-- section: insider-risk-management | objectives: 4.4.1 -->
## Gestion des risques internes

La **gestion des risques internes Microsoft Purview** (Insider Risk Management) aide à réduire les risques internes en permettant de **détecter et d'examiner** les activités à risque ou malveillantes dans l'organisation, puis d'**agir**, qu'elles soient intentionnelles ou involontaires : fuites de données sensibles, vol de propriété intellectuelle, violations de confidentialité, fraude, délit d'initié, violations de la conformité réglementaire.

Elle repose sur quatre principes :

| Principe | Signification |
| --- | --- |
| **Transparence** | Équilibrer la vie privée des utilisateurs et le risque pour l'organisation, avec une confidentialité dès la conception : les utilisateurs sont **pseudonymisés par défaut** |
| **Configurable** | Des stratégies adaptées au secteur, à la zone géographique et aux groupes métier |
| **Intégré** | Un seul flux de travail à travers les solutions Microsoft Purview |
| **Actionnable** | Des informations qui débouchent sur des notifications aux réviseurs, des investigations sur les données et des investigations sur les utilisateurs |

Le flux de travail comporte cinq étapes :

| Étape | Ce qui se passe |
| --- | --- |
| **Stratégies** | Créées à partir de **modèles** prédéfinis ; elles définissent les indicateurs de risque, les utilisateurs concernés et la période |
| **Alertes** | Générées automatiquement quand des indicateurs de risque correspondent aux conditions de la stratégie |
| **Triage** | Un réviseur examine chaque alerte, puis ouvre un nouveau cas, rattache l'alerte à un cas existant ou la rejette |
| **Examiner** | Un **cas** rassemble l'activité de l'utilisateur, le contenu lié et les notes de cas |
| **Action** | Envoyer un rappel à l'utilisateur, ou transmettre le cas à eDiscovery pour une investigation juridique |

Modèles de stratégie à reconnaître : **vol de données par des utilisateurs sortants** (utilise un connecteur RH pour savoir qui part), **fuites de données**, **violations de stratégie de sécurité** (utilise les signaux de Microsoft Defender pour point de terminaison), **utilisation risquée de l'IA**, **utilisation abusive des données des patients**.

> **Piège d'examen.** La DLP regarde le **contenu** et bloque une action au moment où elle se produit. La gestion des risques internes regarde le **comportement d'un utilisateur** dans la durée et émet des alertes en vue d'une investigation : son but est de détecter et d'examiner, pas de bloquer.

<!-- section: ediscovery | objectives: 4.4.2 -->
## Solutions eDiscovery de Microsoft Purview

**eDiscovery** (découverte électronique) est le processus qui consiste à identifier et à fournir des informations électroniques utilisables comme **preuves dans des affaires juridiques**. Le portail Microsoft Purview propose une expérience eDiscovery unifiée ; selon les licences, des fonctionnalités premium s'y ajoutent. Pour l'utiliser, il faut avoir reçu les autorisations appropriées.

| Élément | Rôle |
| --- | --- |
| **Cas** (case) | Contient toutes les recherches, les mises en attente et les ensembles de révision d'une investigation ; l'accès est limité aux membres du cas |
| **Recherche** | Trouve du contenu dans les boîtes aux lettres Exchange, les groupes Microsoft 365, Microsoft Teams, les sites SharePoint, les comptes OneDrive et Viva Engage |
| **Mise en attente** (hold) | Préserve le contenu d'un emplacement pour qu'il ne puisse pas être supprimé, par inadvertance ou volontairement, pendant l'investigation |
| **Exportation** | Copie les résultats de recherche dans un package que vous téléchargez pour un examen hors de Microsoft 365 |
| **Ensemble de révision** (review set, premium) | Une copie sécurisée et statique du contenu collecté, dans laquelle vous recherchez, filtrez, étiquetez et analysez |

Autres fonctionnalités premium : la reconnaissance optique de caractères pour rendre le texte des images recherchable, le regroupement des conversations Teams et Viva Engage en fils, l'analyse pour écarter le contenu sans rapport, et le déchiffrement automatique des éléments chiffrés.

La recherche de contenu, autrefois un outil séparé, fait maintenant partie d'eDiscovery.

> **Conseil d'examen.** « Affaire juridique », « litige », « préserver du contenu », « conservation légale », « preuves » : eDiscovery. Une mise en attente l'emporte sur les paramètres de rétention : le contenu en attente n'est pas supprimé définitivement tant que la mise en attente n'est pas levée.

<!-- section: audit | objectives: 4.4.3 -->
## Solutions d'audit de Microsoft Purview

**Microsoft Purview Audit** enregistre les activités des utilisateurs et des administrateurs dans les services Microsoft, dans un **journal d'audit unifié** : fichiers ouverts ou partagés dans SharePoint et OneDrive, e-mails consultés dans Exchange, messages et réunions dans Teams, connexions et attributions de rôles dans Microsoft Entra ID, interactions avec Microsoft 365 Copilot. Les équipes de sécurité, de conformité et juridiques y recherchent des éléments pour les investigations et pour respecter les obligations de conformité.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Activé par défaut | Oui | Oui |
| Activités auditées | Des milliers, recherchables | Les mêmes |
| Rétention par défaut des enregistrements | 180 jours | Un an pour les enregistrements Microsoft Entra ID, Exchange, OneDrive et SharePoint ; 180 jours pour les autres |
| Stratégies de rétention des journaux d'audit | Non | Oui : par service, activité ou utilisateur |
| Rétention jusqu'à 10 ans | Non | Oui, avec une licence de module complémentaire |
| Insights intelligents | Non | Oui : par exemple quels éléments de courrier ont été consultés, ce que les utilisateurs ont recherché |
| Accès à l'API Activité de gestion Office 365 | Bande passante standard | Bande passante supérieure |

Les données d'audit se consultent avec l'**outil de recherche dans le journal d'audit** du portail Microsoft Purview (les résultats s'exportent dans un fichier CSV), avec une cmdlet PowerShell ou par des API, par exemple pour alimenter un SIEM.

| Besoin | Réponse |
| --- | --- |
| Savoir qui a supprimé un fichier ou modifié une autorisation de boîte aux lettres le mois dernier | Audit |
| Conserver les enregistrements d'audit pendant plusieurs années | Audit (Premium) |
| Préserver la boîte aux lettres d'un responsable sur le départ pour un procès et exporter les e-mails pertinents | eDiscovery (mise en attente, recherche, exportation) |
| Être alerté quand un employé démissionnaire télécharge de nombreux fichiers confidentiels | Gestion des risques internes |
| Bloquer l'envoi de numéros de carte de crédit par e-mail | Protection contre la perte de données |

<!-- section: key-points -->
## Points clés

- Gestion des risques internes : détecter et examiner les activités à risque des utilisateurs, puis agir. Flux de travail : stratégies, alertes, triage, examen, action. Les utilisateurs sont pseudonymisés par défaut.
- Les modèles de stratégie comprennent le vol de données par des utilisateurs sortants, les fuites de données et les violations de stratégie de sécurité.
- eDiscovery : identifier et fournir des preuves électroniques pour des affaires juridiques, avec des cas, des recherches, des mises en attente et des exportations ; les ensembles de révision sont une fonctionnalité premium.
- Une mise en attente préserve le contenu contre la suppression.
- Audit : journal d'audit unifié des activités des utilisateurs et des administrateurs. Standard conserve les enregistrements 180 jours ; Premium conserve un an pour Microsoft Entra ID, Exchange, OneDrive et SharePoint, jusqu'à 10 ans avec un module complémentaire, et ajoute les stratégies de rétention et les insights intelligents.
- Qui a fait quoi : Audit. Preuves pour un procès : eDiscovery. Comportement à risque d'un utilisateur : gestion des risques internes. Contenu sensible qui sort : DLP.
