Active Directory Domain Services (AD DS) constitue le niveau 0 (Tier 0) d'un réseau Windows : qui contrôle un contrôleur de domaine ou un groupe privilégié contrôle tout. Ce chapitre couvre les règles de mot de passe, les protections des comptes, le durcissement des contrôleurs de domaine, les groupes privilégiés, la délégation et les protocoles d'authentification que l'examen vous demande de restreindre.

<!-- section: password-policies | objectives: 6.2.1 -->
## Stratégies de mot de passe

Un domaine a **une seule** stratégie de mot de passe et de verrouillage par défaut pour les comptes de domaine : celle définie dans un GPO **lié au domaine** (la Default Domain Policy par défaut). Valeurs par défaut : historique 24, durée de vie maximale 42 jours, durée de vie minimale 1 jour, longueur minimale 7, complexité activée.

Les **stratégies de mot de passe affinées** (objets de paramètres de mot de passe, PSO) donnent des règles différentes à des utilisateurs différents dans le même domaine :

- Stockées dans **System > Password Settings Container** ; créées dans le Centre d'administration Active Directory (ADAC) ou en PowerShell, par les Domain Admins par défaut.
- S'appliquent aux **utilisateurs et aux groupes de sécurité globaux** uniquement, jamais aux unités d'organisation. Pour cibler une UO, utilisez un groupe fantôme (shadow group).
- Quand plusieurs PSO s'appliquent, **la plus petite valeur de priorité (precedence) l'emporte** ; un PSO lié directement à l'utilisateur l'emporte sur les PSO reçus par des groupes.
- Contiennent les paramètres de mot de passe et de verrouillage (seuil, durée, fenêtre d'observation).

```powershell
New-ADFineGrainedPasswordPolicy -Name "PSO-Admins" -Precedence 10 -MinPasswordLength 16 `
  -ComplexityEnabled $true -PasswordHistoryCount 24 -MaxPasswordAge "60.00:00:00" `
  -LockoutThreshold 5 -LockoutDuration "00:30:00" -LockoutObservationWindow "00:30:00"
Add-ADFineGrainedPasswordPolicySubject -Identity "PSO-Admins" -Subjects "Tier0-Admins"
Get-ADUserResultantPasswordPolicy -Identity anna
```

Dans ADAC, **View Resultant Password Settings** sur un utilisateur affiche le PSO effectif.

> **Piège d'examen.** « Des mots de passe plus stricts pour les utilisateurs de l'UO Finance » ne se règle pas avec un GPO lié à l'UO Finance : ce GPO ne modifie que les comptes locaux des ordinateurs de l'UO. Créez un PSO et appliquez-le à un groupe global qui contient ces utilisateurs.

<!-- section: entra-password-protection | objectives: 6.2.2 -->
## Protection par mot de passe Microsoft Entra pour AD DS

La protection par mot de passe Microsoft Entra refuse les mots de passe faibles (liste globale de mots de passe interdits de Microsoft plus la **liste personnalisée de mots de passe interdits** de votre locataire) quand un mot de passe local est **modifié ou réinitialisé**. Les mots de passe existants ne sont pas vérifiés.

| Composant | Où | Rôle |
| --- | --- | --- |
| Service proxy | N'importe quel serveur joint au domaine (au moins deux par forêt) | Télécharge la stratégie depuis Microsoft Entra ID ; exige HTTPS sortant ; sans état |
| Agent DC (service et DLL de filtre de mot de passe) | **Chaque** contrôleur de domaine accessible en écriture | Valide les mots de passe d'après la stratégie en cache ; ne communique jamais avec Internet |

La stratégie est mise en cache dans SYSVOL et répliquée vers les autres contrôleurs de domaine : le domaine doit donc utiliser **DFSR** pour SYSVOL. Aucune modification de schéma, aucun nouveau port sur les contrôleurs de domaine, aucune dépendance à la synchronisation de hachage de mot de passe. L'installation de l'agent DC exige un **redémarrage**. Les RODC n'ont pas besoin de l'agent (ils transmettent les changements de mot de passe aux contrôleurs de domaine accessibles en écriture), et le proxy n'est pas pris en charge sur un RODC.

Ordre de déploiement :

1. Installez le service proxy, puis `Import-Module AzureADPasswordProtection`.
2. `Register-AzureADPasswordProtectionProxy` (première inscription : Global Administrator).
3. `Register-AzureADPasswordProtectionForest` (Global Administrator ou Security Administrator dans Entra ID, plus Enterprise Admins en local).
4. Installez l'agent DC sur chaque contrôleur de domaine et redémarrez.
5. Dans le Centre d'administration Microsoft Entra (**Méthodes d'authentification > Protection par mot de passe**), gardez d'abord le mode **Audit**, puis passez en mode **Appliqué** (Enforced).

> **Piège d'examen.** Installer l'agent sur une partie seulement des contrôleurs de domaine est une configuration de test : un utilisateur qui change son mot de passe auprès d'un contrôleur de domaine sans agent n'est pas vérifié. Déployez l'agent sur tous les contrôleurs de domaine accessibles en écriture.

<!-- section: protected-users | objectives: 6.2.3 -->
## Utilisateurs protégés

**Protected Users** (Utilisateurs protégés) est un groupe global (RID 525) dont les membres reçoivent des protections non configurables. Les protections côté contrôleur de domaine exigent le niveau fonctionnel de domaine **Windows Server 2012 R2**.

| Où | Protection |
| --- | --- |
| Appareil | Pas de mise en cache des informations d'identification en clair par CredSSP ou WDigest, pas de NTOWF NTLM en cache, pas de clés Kerberos DES ou RC4, **pas d'ouverture de session hors connexion avec informations mises en cache** |
| Contrôleur de domaine | **Pas d'authentification NTLM**, pas de DES ni de RC4 dans la pré-authentification Kerberos, **pas de délégation contrainte ni non contrainte**, durée de vie du TGT de **4 heures**, non renouvelable |

Règles :

- N'ajoutez jamais de **comptes de service ni de comptes d'ordinateur** : aucun bénéfice, et ils cessent de fonctionner.
- Testez avant d'ajouter des Domain Admins : un membre qui ne peut pas utiliser Kerberos (par exemple, une adresse IP ou une application qui ne fait que du NTLM) est bloqué.
- Les comptes ont besoin de clés AES : un compte dont le mot de passe a été changé il y a longtemps peut nécessiter une réinitialisation.
- Les échecs apparaissent dans **Journaux des applications et des services\Microsoft\Windows\Authentication\ProtectedUserFailures-DomainController** (désactivé par défaut).

```powershell
Add-ADGroupMember -Identity "Protected Users" -Members "adm-anna"
```

> **Piège d'examen.** Après l'ajout d'un administrateur à Protected Users, sa connexion à distance par adresse IP échoue : la connexion par IP utilise NTLM, qui est bloqué. Connectez-vous par le nom (Kerberos).

<!-- section: harden-dcs | objectives: 6.2.4 -->
## Durcir les contrôleurs de domaine

| Domaine | Recommandation |
| --- | --- |
| Physique | Baies sécurisées dédiées ; TPM et **BitLocker** sur tous les volumes du contrôleur de domaine ; **RODC** là où le contrôleur de domaine ne peut pas être mis sous clé |
| Contrôleurs de domaine virtuels | Hôtes séparés des autres machines virtuelles ; stockage illisible par les administrateurs du stockage ; machines virtuelles dotées d'une protection maximale (shielded VMs) si les hôtes sont partagés |
| Système d'exploitation | Version de Windows Server prise en charge la plus récente ; **Server Core** ; uniquement les rôles AD DS et DNS |
| Configuration | Base de référence imposée par un GPO sur l'UO Domain Controllers (scénario OSConfig `DomainController` sur Windows Server 2025) |
| Logiciels | Minimum de logiciels installés, pas d'agents de gestion généralistes ; mises à jour des contrôleurs de domaine séparées et prioritaires |
| Internet | **Aucune navigation web** depuis les contrôleurs de domaine ; blocage de l'accès Internet sortant au périmètre |
| Supervision | Capteurs Microsoft Defender pour Identity sur les contrôleurs de domaine |

Les contrôleurs de domaine Windows Server 2025 exigent aussi la **signature LDAP** par défaut sur les nouveaux déploiements, prennent en charge LDAP sur TLS 1.3, n'émettent plus de TGT RC4, refusent le mot de passe par défaut des comptes d'ordinateur (**Domain controller: Refuse setting default machine account password**) et exigent une connexion chiffrée pour les attributs confidentiels.

Pour auditer les clients avant d'imposer la **liaison de canal LDAP** (channel binding), activez les événements 3074 et 3075.

<!-- section: restrict-dc-access | objectives: 6.2.5 -->
## Restreindre l'accès aux contrôleurs de domaine

Trois outils, du plus simple au plus fort :

1. Les **droits utilisateur** dans un GPO lié à l'UO Domain Controllers : limitez *Allow log on locally* et *Allow log on through Remote Desktop Services* aux administrateurs du niveau 0 ; n'autorisez RDP que depuis des serveurs de rebond ou des **stations de travail à accès privilégié (PAW)**, en l'imposant aussi par des règles du Pare-feu Windows.
2. Les **droits de refus** pour les comptes du niveau 0 sur les niveaux inférieurs (serveurs membres et postes de travail) : *Deny access to this computer from the network*, *Deny log on as a batch job*, *Deny log on as a service*, *Deny log on locally*, *Deny log on through Remote Desktop Services*.
3. Les **stratégies d'authentification et silos de stratégies d'authentification** : des restrictions appliquées par Kerberos sur l'origine depuis laquelle un compte peut s'authentifier et sur la durée de vie de son TGT.

| Élément | Détail |
| --- | --- |
| Prérequis | Niveau fonctionnel de domaine **Windows Server 2012 R2** ; **KDC support for claims, compound authentication and Kerberos armoring** dans la Default Domain Controllers Policy (et le paramètre client Kerberos sur les appareils) |
| Stratégie d'authentification | Durée de vie du TGT (minutes) et conditions de contrôle d'accès comme « membre du silo » ; en **mode audit** sauf si elle est créée avec `-Enforce` |
| Silo | Regroupe des utilisateurs, des ordinateurs et des comptes de service ; un compte appartient à un seul silo ; **audit seul** par défaut sauf avec `-Enforce` |
| Exception | L'Administrator intégré (RID 500) en est toujours exempté |

```powershell
New-ADAuthenticationPolicy -Name "Tier0-Policy" -UserTGTLifetimeMins 240 -Enforce
New-ADAuthenticationPolicySilo -Name "Tier0-Silo" -UserAuthenticationPolicy "Tier0-Policy" `
  -ComputerAuthenticationPolicy "Tier0-Policy" -Enforce
Grant-ADAuthenticationPolicySiloAccess -Identity "Tier0-Silo" -Account "adm-anna"
Set-ADAccountAuthenticationPolicySilo -Identity "adm-anna" -AuthenticationPolicySilo "Tier0-Silo"
```

> **Piège d'examen.** Une stratégie ou un silo créé sans `-Enforce` ne restreint rien : il se contente de journaliser ce qu'il bloquerait. Consultez le journal **Authentication Policy Failures - Domain Controller** pendant la phase d'audit.

<!-- section: user-account-options | objectives: 6.2.6 -->
## Options de sécurité des comptes d'utilisateur

Options de l'onglet **Compte** d'un utilisateur (ADUC ou ADAC) :

| Option | Usage |
| --- | --- |
| Account is sensitive and cannot be delegated | Comptes d'administration : leurs informations d'identification ne peuvent pas être déléguées par un service |
| Smart card is required for interactive logon | Impose la connexion par carte à puce ; le mot de passe devient une valeur aléatoire |
| This account supports Kerberos AES 128/256 bit encryption | Autorise AES pour le compte |
| Use only Kerberos DES encryption types | Hérité ; DES est supprimé dans Windows Server 2025 |
| Do not require Kerberos preauthentication | À éviter : permet de casser hors ligne la réponse AS-REP (AS-REP roasting) |
| Store password using reversible encryption | À éviter : équivaut à un mot de passe stocké en clair |
| Password never expires | À éviter pour les utilisateurs ; utilisez un gMSA pour les services |

Autres contrôles : **Se connecter à** (ordinateurs autorisés), **Horaires d'accès**, **Date d'expiration du compte**, et la stratégie de verrouillage. Repérez les indicateurs à risque en PowerShell :

```powershell
Get-ADUser -Filter 'DoesNotRequirePreAuth -eq $true' -Properties DoesNotRequirePreAuth
Set-ADAccountControl -Identity adm-anna -AccountNotDelegated $true
```

> **Conseil d'examen.** « Empêcher l'utilisation des informations d'identification d'un administrateur par délégation Kerberos » a deux bonnes réponses : **Account is sensitive and cannot be delegated**, ou l'appartenance à **Protected Users** (qui ajoute d'autres restrictions).

<!-- section: admin-groups | objectives: 6.2.7 -->
## Groupes d'administration intégrés

| Groupe | État recommandé |
| --- | --- |
| Enterprise Admins, Schema Admins | **Vides** ; n'y ajoutez un compte que pendant une modification à l'échelle de la forêt ou du schéma |
| Domain Admins | **Aucun membre au quotidien** (sauf le compte Administrator intégré sécurisé) ; ajoutez un compte temporairement pour la construction ou la reprise après sinistre, utilisé uniquement sur les contrôleurs de domaine et les systèmes du niveau 0 |
| Administrators (domaine) | Conserve Enterprise Admins et Domain Admins comme membres (nécessaire à la récupération de la forêt) |
| Account Operators, Server Operators, Print Operators, Backup Operators | **Vides** : ils peuvent ouvrir une session sur les contrôleurs de domaine et agir dessus (Backup Operators peut sauvegarder et restaurer tous les fichiers) |
| Administrator intégré (RID 500) | Construction et reprise après sinistre uniquement ; **sensitive and cannot be delegated**, **smart card required**, droits de refus sur les serveurs membres et les postes de travail |

Les membres de ces groupes sont des **comptes protégés** : toutes les 60 minutes, **SDProp** (sur l'émulateur PDC) rétablit leurs autorisations d'après celles d'**AdminSDHolder** (`CN=AdminSDHolder,CN=System,...`) et désactive l'héritage. L'intervalle se règle avec `AdminSDProtectFrequency` (60 à 7 200 secondes).

Les droits de refus par GPO pour Enterprise Admins, Domain Admins et l'Administrator intégré se lient aux UO des **serveurs membres et des postes de travail**, jamais au niveau du domaine. Les serveurs de rebond qui administrent les contrôleurs de domaine restent hors de ces UO. Auditez toute modification de ces groupes et déclenchez une alerte.

> **Piège d'examen.** Un groupe de support à qui l'on a délégué « réinitialiser le mot de passe » sur une UO ne peut pas réinitialiser le mot de passe d'un Domain Admin de cette UO : AdminSDHolder remplace les autorisations héritées des comptes protégés dans l'heure.

<!-- section: ad-delegation | objectives: 6.2.8 -->
## Gérer la délégation AD

La délégation accorde des autorisations précises sur une UO à un groupe, au lieu de faire des Domain Admins.

- **Assistant Délégation de contrôle** (clic droit sur une UO dans ADUC) : choisissez un groupe, puis des tâches courantes (créer, supprimer et gérer des comptes d'utilisateur ; réinitialiser les mots de passe et forcer leur changement à la prochaine ouverture de session ; modifier l'appartenance d'un groupe ; gérer les liens de stratégie de groupe) ou une tâche personnalisée sur des types d'objets et des propriétés précis.
- Déléguez à des **groupes**, sur l'**UO la plus haute** qui couvre le besoin, et laissez les autorisations s'hériter.
- Vérifiez les délégations : ADUC **Affichage > Fonctionnalités avancées**, puis l'onglet **Sécurité** de l'objet > **Avancé** (l'onglet **Accès effectif** teste un utilisateur), ou `dsacls`.
- N'utilisez pas les groupes d'opérateurs intégrés pour déléguer : leurs droits atteignent les contrôleurs de domaine.
- La délégation des stratégies de groupe est distincte : dans la console de gestion des stratégies de groupe, l'onglet **Délégation** d'un GPO, d'une UO ou du conteneur Objets de stratégie de groupe (création de GPO : **Group Policy Creator Owners**).

```powershell
dsacls "OU=Paris,DC=contoso,DC=com"
dsacls "OU=Paris,DC=contoso,DC=com" /I:S /G "CONTOSO\HD-Paris:CA;Reset Password;user"
```

> **Piège d'examen.** L'Assistant ne fait qu'ajouter des autorisations : il ne peut pas retirer une délégation. Pour révoquer, modifiez l'ACL (Paramètres de sécurité avancés) ou utilisez `dsacls /R`.

<!-- section: auth-protocols | objectives: 6.2.9 -->
## Protocoles et méthodes d'authentification

**Kerberos** est le protocole par défaut dans un domaine ; **NTLM** sert de repli (adresses IP, machines de groupe de travail, applications qui n'utilisent pas Negotiate). Sur Windows Server 2025, **NTLMv1 est supprimé**, LANMAN et NTLMv2 sont dépréciés, **DES est supprimé** et RC4 est déprécié.

| Objectif | Paramètre (Configuration ordinateur > Stratégies > Paramètres Windows > Paramètres de sécurité > Stratégies locales > Options de sécurité) |
| --- | --- |
| Refuser LM et NTLMv1 | **Network security: LAN Manager authentication level** = Send NTLMv2 response only. Refuse LM & NTLM |
| Repérer l'usage de NTLM avant de bloquer | **Network security: Restrict NTLM: Audit NTLM authentication in this domain** (sur les contrôleurs de domaine) et **Audit incoming NTLM traffic** |
| Bloquer NTLM | **Network security: Restrict NTLM: NTLM authentication in this domain** = Deny all, avec **Add server exceptions in this domain** |
| Chiffrement Kerberos autorisé | **Network security: Configure encryption types allowed for Kerberos** (AES uniquement) ; l'ancienne valeur de registre n'est plus prise en compte sur Windows Server 2025 |
| Signature LDAP | **Domain controller: LDAP server signing requirements** = Require signing |
| Liaison de canal LDAP | **Domain controller: LDAP server channel binding token requirements** = Always |

Les événements d'audit NTLM vont dans **Journaux des applications et des services\Microsoft\Windows\NTLM\Operational**. Le **blindage Kerberos (FAST)** protège la pré-authentification ; il s'active par les paramètres KDC et client *support for claims, compound authentication and Kerberos armoring*.

Méthodes plus fortes : **cartes à puce** ou Windows Hello Entreprise (Kerberos par certificat, PKINIT), Protected Users pour les administrateurs, gMSA ou dMSA pour les services (aucun mot de passe géré par un humain).

> **Piège d'examen.** **Auditez** toujours NTLM avant de le refuser. Passer directement à *Deny all* casse chaque application ou appareil qui utilise encore NTLM.

<!-- section: key-points -->
## Points clés

- Une seule stratégie de mot de passe de domaine (GPO lié au domaine) ; des PSO pour les utilisateurs et les groupes globaux, la plus petite priorité l'emporte.
- Protection par mot de passe Entra : proxy plus agent DC sur chaque contrôleur de domaine accessible en écriture, SYSVOL en DFSR, redémarrage, audit puis application.
- Protected Users : pas de NTLM, pas de délégation, TGT de 4 heures, pas de session en cache ; jamais pour des comptes de service ou d'ordinateur.
- Durcir les contrôleurs de domaine : Server Core, BitLocker, pas de navigation, mises à jour séparées, RODC là où la sécurité physique est faible.
- Restreindre l'accès aux contrôleurs de domaine par les droits utilisateur, les droits de refus sur les niveaux inférieurs et des silos de stratégies d'authentification appliqués.
- Enterprise Admins, Schema Admins et groupes d'opérateurs vides, aucun membre au quotidien dans Domain Admins ; AdminSDHolder écrase les autorisations déléguées.
- Déléguer à des groupes avec l'Assistant ; révoquer en modifiant les ACL.
- Auditer NTLM avant de le bloquer ; Kerberos en AES uniquement ; signature et liaison de canal LDAP.
