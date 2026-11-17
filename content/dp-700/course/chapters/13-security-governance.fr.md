La sécurité de Fabric fonctionne par couches. Un **rôle d'espace de travail** ou une **autorisation d'élément** ouvre un élément ; ensuite, le moteur qui lit les données applique des règles plus fines : autorisations T-SQL, sécurité au niveau des lignes et des colonnes et masquage dynamique des données dans l'entrepôt et le point de terminaison d'analytique SQL, et rôles de **sécurité OneLake** pour les dossiers et tables lus par tous les moteurs. La gouvernance ajoute les étiquettes de confidentialité, l'approbation et les journaux d'audit. Les questions donnent un utilisateur, une exigence et une contrainte de « moindre privilège », et demandent quel contrôle utiliser et où le définir.

<!-- section: workspace-roles | objectives: 1.3.1 -->
## Les rôles d'espace de travail

Un rôle d'espace de travail s'applique à **tous les éléments** de l'espace de travail, présents et futurs. Il peut être attribué à des utilisateurs, des groupes de sécurité, des groupes Microsoft 365, des listes de distribution et des principaux de service ; un utilisateur qui reçoit plusieurs rôles garde le **plus élevé**.

| Capacité | Admin | Member | Contributor | Viewer |
| --- | --- | --- | --- | --- |
| Supprimer l'espace de travail, ajouter ou retirer des Admins, modifier les paramètres de l'espace de travail (Spark, connexion Git) | Oui | Non | Non | Non |
| Ajouter des membres et des rôles inférieurs | Oui | Oui | Non | Non |
| Partager des éléments et autoriser le repartage | Oui | Oui | Avec Reshare uniquement | Avec Reshare uniquement |
| Créer, modifier et supprimer des éléments ; écrire des données de lakehouse et d'entrepôt | Oui | Oui | Oui | Non |
| Exécuter des notebooks, des pipelines et des définitions de travail Spark | Oui | Oui | Oui | Non |
| Lire les données avec Spark et les API OneLake (ReadAll) | Oui | Oui | Oui | Non |
| Interroger les tables de lakehouse et d'entrepôt en T-SQL | Oui | Oui | Oui | Oui |
| Voir les éléments et l'historique des exécutions | Oui | Oui | Oui | Oui |

| Exigence | Rôle |
| --- | --- |
| Créer et exécuter des notebooks et des pipelines, sans gérer les accès | Contributor |
| Ajouter aussi des collègues à l'espace de travail | Member |
| Modifier les paramètres Spark, connecter Git, attribuer l'espace de travail à un domaine | Admin |
| Lire des rapports et interroger des tables en T-SQL, sans rien modifier | Viewer |

> **Piège d'examen.** Admin, Member et Contributor ont l'autorisation d'écriture sur chaque élément, donc ils échappent aux contrôles fins de ce chapitre : la sécurité SQL au niveau des lignes s'applique encore à leurs requêtes T-SQL, mais les rôles de sécurité OneLake et le masquage dynamique des données ne les restreignent pas. Donnez aux utilisateurs à restreindre le rôle Viewer ou seulement des autorisations d'élément.

<!-- section: item-permissions | objectives: 1.3.2 -->
## Les autorisations d'élément

Pour donner accès à **un seul élément** sans rôle d'espace de travail, **partagez-le** (ou utilisez **Manage permissions**). Le destinataire reçoit toujours **Read**, plus les options que vous cochez. Le partage n'accorde jamais l'écriture.

| Option de la boîte de dialogue de partage | Autorisation | Permet |
| --- | --- | --- |
| (toujours) | Read | Ouvrir l'élément et se connecter au point de terminaison d'analytique SQL ; aucun accès aux tables à lui seul |
| Read all data using SQL | ReadData | Lire toutes les tables et vues en T-SQL, comme `db_datareader` |
| Read all data using Apache Spark | ReadAll | Lire les fichiers de l'élément dans OneLake avec Spark, les API OneLake et l'explorateur de lakehouse |
| Subscribe to events | SubscribeOneLakeEvents | S'abonner aux événements OneLake de l'élément dans le hub en temps réel ; accordée avec ReadAll |
| Share | Reshare | Partager l'élément à son tour |

Les entrepôts ont aussi une autorisation **Monitor** (interroger les DMV) et une autorisation **Audit** (configurer et interroger les journaux d'audit SQL ; les Admins de l'espace de travail la détiennent par défaut). L'octroi ou le retrait d'une autorisation peut prendre **jusqu'à deux heures** pour se propager. Un entrepôt ne peut pas être partagé directement avec un principal de service, et ses destinataires ne peuvent pas le repartager.

| Exigence | Accorder |
| --- | --- |
| Des analystes interrogent toutes les tables de DW1 en T-SQL | Partage avec ReadData |
| Un data scientist lit les fichiers d'un lakehouse dans un notebook d'un autre espace de travail | Partage avec ReadAll |
| Un utilisateur ne lit que le schéma `Sales` | Partage sans option (Read), puis `GRANT` en T-SQL |

> **Piège d'examen.** ReadData et ReadAll sont indépendantes. Un utilisateur qui n'a que ReadData peut interroger le point de terminaison d'analytique SQL mais obtient une erreur d'accès quand un notebook lit les fichiers du lakehouse.

<!-- section: granular-access | objectives: 1.3.3 -->
## Sécurité au niveau de l'objet, des colonnes et des lignes

Dans un entrepôt ou un point de terminaison d'analytique SQL, les contrôles fins sont en T-SQL. Vous ne pouvez pas exécuter `CREATE USER` : `GRANT` ou `DENY` crée l'utilisateur de base de données, qui a toujours besoin d'un rôle d'espace de travail ou au moins de Read sur l'élément pour se connecter.

| Niveau | Fonctionnalité | Comportement |
| --- | --- | --- |
| Objet | `GRANT`, `DENY`, `REVOKE` sur des schémas, tables, vues, procédures | `DENY` l'emporte sur `GRANT` ; des rôles de base de données personnalisés regroupent les autorisations |
| Colonne | `GRANT SELECT` sur une liste de colonnes | Un `SELECT *` de l'utilisateur échoue au lieu de renvoyer les autres colonnes |
| Ligne | Fonction de prédicat plus stratégie de sécurité | Les lignes qui ne correspondent pas disparaissent silencieusement des `SELECT`, `UPDATE` et `DELETE` |
| Dossier, fichier, table pour tous les moteurs | Rôles de sécurité OneLake | Voir la section sur la sécurité OneLake |

```text
-- Object level: one schema readable, one table hidden
GRANT SELECT ON SCHEMA::Sales TO [Analysts];
DENY SELECT ON OBJECT::Sales.Payroll TO [Analysts];

-- Column level
GRANT SELECT ON dbo.Customers (CustomerID, City, Segment) TO [Marketing];

-- Row level
CREATE FUNCTION Security.fn_region(@Region AS varchar(20))
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS allowed
    WHERE @Region = (SELECT Region FROM Security.UserRegion
                     WHERE UserName = USER_NAME());
GO
CREATE SECURITY POLICY Security.RegionFilter
ADD FILTER PREDICATE Security.fn_region(Region) ON dbo.FactSales
WITH (STATE = ON);
```

- Une stratégie de sécurité peut porter des prédicats pour plusieurs tables ; chaque table a besoin de son propre `ADD FILTER PREDICATE`.
- Pour modifier la fonction, supprimez ou modifiez d'abord la stratégie, car la fonction est liée au schéma (schema-bound).
- Les utilisateurs vérifient leurs propres droits avec `sys.fn_my_permissions`.

> **Piège d'examen.** La sécurité T-SQL ne protège que les requêtes qui passent par le moteur SQL. Un utilisateur qui a ReadAll lit les mêmes fichiers Delta avec Spark, sans aucune de ces règles. Protégez chaque chemin : retirez ReadAll, ou utilisez la sécurité OneLake.

<!-- section: onelake-security | objectives: 1.3.3, 1.3.8 -->
## La sécurité OneLake

La **sécurité OneLake** définit des **rôles d'accès aux données** sur un élément : chaque rôle donne accès à des **tables, schémas ou dossiers** choisis (sécurité au niveau du dossier et du fichier), éventuellement avec des règles au niveau des **lignes** et des **colonnes**, à des utilisateurs ou des groupes. Les règles s'appliquent à tous les moteurs qui lisent via OneLake : Spark, le point de terminaison d'analytique SQL, l'explorateur de lakehouse, les API OneLake et les autres moteurs Fabric.

| Élément | Autorisations d'un rôle |
| --- | --- |
| Lakehouse | **Read**, **ReadWrite** (écrire des données dans les tables ou dossiers choisis via Spark, l'explorateur de fichiers OneLake ou les API, sans créer ni gérer d'éléments) |
| Base de données mise en miroir, catalogue mis en miroir, catalogue Azure Databricks mis en miroir | Read |

Règles :

- Les rôles sont créés par les utilisateurs qui ont **Write et Reshare**, en pratique les Admins et Members de l'espace de travail.
- L'accès est **refusé par défaut** : un utilisateur restreint qui n'est dans aucun rôle ne voit aucune donnée. Plusieurs rôles se combinent par union.
- Le rôle par défaut **DefaultReader** contient tous les utilisateurs qui ont ReadAll. Quand vous restreignez un utilisateur avec un rôle personnalisé, **retirez-le de DefaultReader** (ou supprimez ce rôle, ou retirez ReadAll), sinon il garde un accès complet.
- Le point de terminaison d'analytique SQL démarre en **mode d'identité déléguée** (les requêtes utilisent l'identité du propriétaire de l'élément et les autorisations T-SQL). Pour y appliquer la sécurité OneLake, basculez-le une fois en **mode d'accès avec l'identité de l'utilisateur** (User's identity access mode) : onglet **Security** > **Data access mode settings** > **Use OneLake security for tables**.
- Les rôles restreignent les Viewers et les utilisateurs qui ont des autorisations d'élément ; les Admins, Members et Contributors gardent l'accès grâce à leur autorisation Write.

| Exigence | Contrôle |
| --- | --- |
| Des stagiaires ne lisent que le dossier `Files/public` de Lakehouse1 avec Spark | Rôle de sécurité OneLake sur ce dossier ; retirer les stagiaires de DefaultReader |
| Des responsables régionaux voient les lignes de leur région dans Spark et en T-SQL | Rôle de sécurité OneLake avec une règle de lignes, point de terminaison en mode identité de l'utilisateur |
| Masquer une colonne de salaire aux utilisateurs Power BI comme aux utilisateurs de notebooks | Rôle de sécurité OneLake avec une règle de colonnes |
| Une équipe partenaire écrit dans un dossier sans être Contributor | Rôle avec ReadWrite sur ce dossier |

> **Piège d'examen.** Un rôle de sécurité OneLake sur un lakehouse n'a aucun effet sur les requêtes T-SQL tant que le point de terminaison d'analytique SQL reste en mode d'identité déléguée.

<!-- section: dynamic-data-masking | objectives: 1.3.4 -->
## Le masquage dynamique des données

Le masquage dynamique des données (DDM) cache les valeurs sensibles **dans les résultats des requêtes** d'un entrepôt ou d'un point de terminaison d'analytique SQL ; les données stockées ne changent pas.

| Fonction | Résultat |
| --- | --- |
| `default()` | Masque complet selon le type : `XXXX` pour les chaînes, 0 pour les nombres, `1900-01-01` pour les dates |
| `email()` | `aXXX@XXXX.com` : première lettre et `.com` |
| `random(start, end)` | Un nombre aléatoire dans la plage, pour les colonnes numériques |
| `partial(prefix, "padding", suffix)` | Garde les premiers et derniers caractères, remplit le milieu |

```text
CREATE TABLE dbo.Employee (
    EmployeeID int,
    LastName varchar(50) MASKED WITH (FUNCTION = 'default()') NULL,
    SSN char(11) MASKED WITH (FUNCTION = 'partial(0,"XXX-XX-",4)') NULL,
    Email varchar(256) NULL
);
ALTER TABLE dbo.Employee
ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');

GRANT UNMASK ON dbo.Employee TO [HRManagers];
ALTER TABLE dbo.Employee ALTER COLUMN Email DROP MASKED;
```

| Opération | Autorisation |
| --- | --- |
| Voir les données masquées | `SELECT` |
| Voir les vraies valeurs | `UNMASK` sur la table ou la colonne, ou `CONTROL` sur la base de données |
| Ajouter, modifier ou supprimer un masque | `ALTER ANY MASK` et `ALTER` sur la table |

Les Admins, Members et Contributors de l'espace de travail ont `CONTROL`, donc ils voient toujours les données non masquées.

> **Piège d'examen.** Le masquage n'est pas une frontière de sécurité. Un utilisateur qui peut interroger la colonne peut déduire les valeurs avec `WHERE Salary BETWEEN 99999 AND 100001`. Quand des utilisateurs ne doivent pas du tout accéder à une colonne, utilisez la sécurité au niveau des colonnes.

<!-- section: sensitivity-labels | objectives: 1.3.5 -->
## Les étiquettes de confidentialité

Les étiquettes de confidentialité viennent de **Microsoft Purview Information Protection**. Un administrateur Fabric les active dans les paramètres du locataire, et les étiquettes doivent être publiées pour les utilisateurs qui les appliquent.

- Appliquez une étiquette depuis l'indicateur de confidentialité dans l'en-tête de l'élément ou dans **Settings > Sensitivity**. Il faut une licence Power BI Pro ou PPU et l'autorisation de modification sur l'élément.
- Un domaine peut définir une **étiquette par défaut** pour ses espaces de travail (paramètre délégué).

| Comportement | Effet |
| --- | --- |
| Étiquette par défaut | Appliquée aux éléments nouveaux ou modifiés quand l'utilisateur n'en choisit aucune |
| Étiquette obligatoire | Les utilisateurs doivent appliquer une étiquette avant d'enregistrer (prise en charge complète pour les éléments Power BI, partielle pour les autres) |
| Héritage à la création | Un notebook, un pipeline ou un raccourci créé à partir d'un lakehouse étiqueté prend son étiquette |
| Héritage en aval | Les étiquettes se propagent aux éléments dépendants, de Fabric à Fabric et de Fabric à Power BI, pas de Power BI à Fabric |
| Exportation | L'étiquette et la protection suivent les exportations vers Excel, PDF, PowerPoint et .pbix |

> **Piège d'examen.** Une étiquette classe un élément et protège les fichiers exportés ; elle ne cache ni lignes ni tables aux utilisateurs qui ont déjà accès dans Fabric.

<!-- section: endorsement | objectives: 1.3.6 -->
## L'approbation

L'approbation (endorsement) ajoute un badge qui indique aux utilisateurs à quels éléments se fier ; les éléments approuvés sont mieux classés dans le catalogue OneLake. Elle se définit dans **Settings > Endorsement** de l'élément.

| Badge | Sens | Qui l'applique |
| --- | --- | --- |
| Promoted (promu) | Prêt à être partagé et réutilisé, selon son créateur | Toute personne qui a l'autorisation d'écriture sur l'élément ; aucune configuration d'administration |
| Certified (certifié) | Vérifié selon les standards de l'organisation | Les utilisateurs autorisés par un administrateur Fabric, ou par un administrateur de domaine quand la certification est déléguée au domaine |
| Master data (données de référence) | La source qui fait autorité pour les données de base (clients, produits) | Les utilisateurs autorisés par un administrateur Fabric ; uniquement les éléments qui contiennent des données, comme les lakehouses et les modèles sémantiques |

Les utilisateurs non autorisés voient **Certified** indisponible et peuvent demander une certification par le lien défini par l'administrateur.

> **Conseil d'examen.** « Marquer le lakehouse comme source officielle vérifiée pour le domaine Finance » signifie Certified, avec la certification déléguée au domaine. « Signaler aux collègues qu'il est prêt, sans passer par un administrateur » signifie Promoted.

<!-- section: audit-logs | objectives: 1.3.7 -->
## Les journaux d'audit

Trois sources répondent à « qui a fait quoi » :

| Source | Enregistre | Accès |
| --- | --- | --- |
| **Journal d'audit Fabric** (journal d'audit unifié Microsoft Purview) | Activités des utilisateurs et des administrateurs dans Fabric et Power BI : création, consultation, partage, suppression d'éléments, modification de paramètres | Portail Purview (`purview.microsoft.com/audit`) ou `Search-UnifiedAuditLog` dans Exchange Online PowerShell ; rôle **Audit Logs** ou **View-Only Audit Logs**. Portail d'administration > **Audit logs** y renvoie |
| **Journal d'activité Power BI** | Activités Power BI uniquement | Administrateur Fabric, par l'API REST d'administration `activityevents` ou `Get-PowerBIActivityEvent` ; un jour UTC par requête |
| **Journaux d'audit SQL** | Événements de l'entrepôt et du point de terminaison d'analytique SQL : connexions, accès aux objets, changements de schéma et d'autorisations, lots | Désactivés par défaut ; activés et interrogés par les utilisateurs qui ont l'autorisation **Audit** (les Admins de l'espace de travail l'ont) |

- Purview conserve les enregistrements d'audit Fabric **180 jours** pour les utilisateurs sans licence E5 ; avec E5, des stratégies de rétention du journal d'audit peuvent les conserver jusqu'à un an. Les enregistrements peuvent mettre une heure ou plus à apparaître.
- Les journaux d'audit SQL sont des fichiers `.XEL` dans le dossier **Audit** de l'entrepôt dans OneLake. Vous choisissez des **groupes d'actions** (Object Was Accessed, Schema Was Changed, User Failed To Log In...) et un filtre de prédicat facultatif. Sur le point de terminaison d'analytique SQL, les opérations DML ne sont pas capturées.

```text
-- Let an auditor query the SQL audit logs without being workspace Admin
GRANT VIEW DATABASE SECURITY AUDIT TO [auditor@contoso.com];
-- The auditor then reads the events with sys.fn_get_audit_file_v2
```

```powershell
Get-PowerBIActivityEvent -StartDateTime '2026-11-02T00:00:00' -EndDateTime '2026-11-02T23:59:59' -ActivityType 'ViewReport'
```

| Exigence | Source |
| --- | --- |
| Trouver qui a supprimé un lakehouse la semaine dernière | Journal d'audit Fabric dans Purview |
| Suivre les échecs de connexion et les changements d'autorisations sur DW1 | Journaux d'audit SQL |
| Enregistrer chaque lecture de fichier dans un lakehouse, y compris via des raccourcis | Diagnostics OneLake (paramètres OneLake de l'espace de travail) |

> **Piège d'examen.** `GRANT VIEW DATABASE SECURITY AUDIT` permet à un utilisateur d'interroger les journaux d'audit SQL, mais ni de modifier la configuration de l'audit ni d'ouvrir les fichiers `.XEL`.

<!-- section: key-points -->
## Points clés

- Rôles : Admin gère l'espace de travail, Member ajoute des personnes, Contributor crée et écrit des données, Viewer lit en T-SQL uniquement (sans ReadAll).
- Le partage donne Read ; ajoutez ReadData pour le T-SQL, ReadAll pour Spark et OneLake ; jamais l'écriture.
- Contrôles T-SQL : `GRANT`/`DENY` pour les objets, listes de colonnes pour la sécurité au niveau des colonnes, fonction de prédicat plus stratégie de sécurité pour la sécurité au niveau des lignes ; ils ne protègent pas l'accès par Spark.
- Sécurité OneLake : rôles sur des tables et dossiers avec règles de lignes et de colonnes facultatives, pour tous les moteurs ; retirez les utilisateurs restreints de DefaultReader ; passez le point de terminaison SQL en mode identité de l'utilisateur.
- Le DDM masque les résultats pour les utilisateurs sans `UNMASK` ni `CONTROL` ; Admin, Member et Contributor voient les vraies valeurs ; ce n'est pas une frontière de sécurité.
- Les étiquettes classent et protègent les exportations ; approbation : Promoted par les rédacteurs, Certified et Master data par des réviseurs autorisés.
- Audit : Purview pour les activités Fabric, journaux d'audit SQL pour les événements de l'entrepôt, diagnostics OneLake pour l'accès aux données.
