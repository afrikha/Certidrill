Chaque connexion Azure Virtual Desktop s'authentifie deux fois : une fois auprès du service via Microsoft Entra ID (flux, passerelle), puis auprès de Windows sur l'hôte de session. Le scénario d'identité choisi détermine comment les hôtes de session sont joints, quel stockage FSLogix peut utiliser, si l'authentification unique fonctionne et de quels rôles les utilisateurs ont besoin. L'examen donne un ensemble d'identités et d'appareils et demande quel scénario, type de jonction, rôle, cible d'accès conditionnel ou propriété RDP répond à l'exigence.

<!-- section: identity-scenarios | objectives: 2.1.1 -->
## Sélectionner un scénario d'identité

Les utilisateurs ont toujours besoin d'une identité dans **Microsoft Entra ID** : c'est là que le service les authentifie. Ils doivent aussi se connecter à Windows avec **la même identité** ; se connecter à Microsoft Entra ID avec un compte et à Windows avec un autre (un compte local, par exemple) n'est pas pris en charge.

| Scénario | Où vivent les utilisateurs | Jonction des hôtes de session | Pris en charge |
| --- | --- | --- | --- |
| AD DS seul, utilisateurs absents de Microsoft Entra ID | AD local (avec ou sans AD FS) | AD DS | **Non** |
| Identité hybride avec AD DS | AD DS, synchronisé vers Microsoft Entra ID avec **Microsoft Entra Connect** (fédération avec AD FS autorisée) | Joint à AD DS, éventuellement joint hybride Microsoft Entra | Oui |
| Identité hybride avec Microsoft Entra Domain Services | Microsoft Entra ID (cloud ou synchronisé), synchronisé à sens unique vers le domaine managé | Joint au domaine Microsoft Entra Domain Services | Oui |
| Identité cloud uniquement | Microsoft Entra ID seulement | **Joint à Microsoft Entra** | Oui |
| Fournisseur d'identité tiers | Fédéré avec Microsoft Entra ID | Joint à Microsoft Entra ou joint hybride, avec l'authentification Microsoft Entra activée | Oui |
| Identités externes (invités Microsoft Entra B2B) | Leur locataire ou fournisseur d'origine, invités dans le vôtre | Joint à Microsoft Entra, avec l'authentification unique ; Windows 11 Entreprise 24H2 ou Windows Server 2025 avec des mises à jour récentes ; Windows App | Oui |

Pour les identités hybrides, le compte AD DS et le compte Microsoft Entra doivent correspondre par **UPN ou SID** (`ObjectSID` = `OnPremisesSecurityIdentifier`). Les utilisateurs hybrides peuvent aussi utiliser des hôtes de session joints à Microsoft Entra.

Comment choisir :

| Exigence | Scénario |
| --- | --- |
| Stratégie de groupe, applications héritées qui ont besoin de Kerberos ou NTLM vers des serveurs locaux, domaine existant | AD DS (identité hybride) |
| Services de domaine sans gérer de contrôleurs de domaine, pas d'AD local | Microsoft Entra Domain Services |
| Aucun contrôleur de domaine, gestion par Intune, utilisateurs cloud uniquement | Microsoft Entra ID (hôtes joints à Microsoft Entra) |
| Donner accès aux utilisateurs d'une organisation partenaire sans leur créer de comptes | Identités externes sur des hôtes joints à Microsoft Entra |

> **Piège d'examen.** « Les utilisateurs n'existent que dans l'Active Directory local » n'est jamais un état final valide : ils doivent être synchronisés vers Microsoft Entra ID avec Microsoft Entra Connect avant de pouvoir utiliser Azure Virtual Desktop, même si les hôtes de session restent joints à AD DS.

<!-- section: session-host-requirements | objectives: 2.1.2 -->
## Conditions requises des hôtes de session pour chaque scénario d'identité

| Scénario | Ce dont les hôtes de session ont besoin |
| --- | --- |
| AD DS | Visibilité directe sur un contrôleur de domaine (DNS du réseau virtuel pointant vers les DC, via peering, VPN ou ExpressRoute) ; un compte de jonction avec les droits de création d'ordinateurs sur l'unité d'organisation (réinitialiser le mot de passe, écritures validées du nom d'hôte DNS et du nom de principal du service, lecture et écriture des restrictions de compte) |
| Microsoft Entra Domain Services | DNS du réseau virtuel réglé sur les adresses du domaine managé ; un compte de jonction membre de **AAD DC Administrators** ; hachages de mots de passe des utilisateurs disponibles dans le domaine managé : les utilisateurs cloud uniquement doivent changer leur mot de passe après l'activation de Domain Services, les utilisateurs synchronisés exigent la synchronisation de hachage de mot de passe via **Microsoft Entra Connect Sync** (Microsoft Entra Cloud Sync n'est pas pris en charge avec Domain Services) |
| Microsoft Entra ID | Type de jonction **Microsoft Entra ID** dans le portail (en option **inscrire auprès d'Intune**), même locataire que l'abonnement ; Windows 11, Windows 10 2004 ou ultérieur, Windows Server 2022 ou 2019 ; aucun contrôleur de domaine nécessaire |

Règles supplémentaires pour les hôtes de session **joints à Microsoft Entra** :

- Les utilisateurs ont besoin du rôle **Virtual Machine User Login** (administrateurs : **Virtual Machine Administrator Login**) sur les machines virtuelles, de préférence sur le groupe de ressources, attribué au même groupe que le groupe d'applications. Cette attribution n'est requise que pour les pools d'hôtes **sans** configuration d'hôte de session.
- Sans authentification unique, le client Windows ne se connecte que si le PC local est joint à Microsoft Entra, joint hybride ou inscrit (Windows 10 2004 ou ultérieur) dans le **même locataire**. Pour les autres PC et pour les clients web, macOS, iOS et Android, ajoutez la propriété RDP `targetisaadjoined:i:1` (nom d'utilisateur et mot de passe uniquement). La réponse recommandée est d'activer l'authentification unique.
- Les profils FSLogix vont sur Azure Files avec **Microsoft Entra Kerberos** ; atteindre des serveurs de fichiers ou des applications locaux exige toujours AD DS et une visibilité directe sur celui-ci.
- Ne mélangez pas les types de jonction dans un même pool d'hôtes.

> **Piège d'examen.** Microsoft Entra Domain Services et Microsoft Entra ID ne sont pas la même option. Microsoft Entra Domain Services est un domaine AD managé : les hôtes y sont joints, les utilisateurs doivent y avoir leurs hachages de mots de passe, et l'authentification unique Microsoft Entra n'y est pas prise en charge. Les hôtes joints à Microsoft Entra n'ont besoin d'aucun domaine.

<!-- section: azure-rbac | objectives: 2.1.3 -->
## Planifier et implémenter Azure RBAC pour Azure Virtual Desktop

Les rôles intégrés couvrent les objets du service (fournisseur `Microsoft.DesktopVirtualization`). Il n'existe pas de rôle Owner propre à Azure Virtual Desktop : utilisez Owner.

| Rôle | Ce qu'il permet | Ce qu'il ne permet pas |
| --- | --- | --- |
| Desktop Virtualization Contributor | Gérer tous les pools d'hôtes, groupes d'applications et espaces de travail | Attribuer des utilisateurs (exige User Access Administrator), gérer les machines virtuelles |
| Desktop Virtualization Reader | Voir toutes les ressources Azure Virtual Desktop | Toute modification |
| Desktop Virtualization User | Utiliser le bureau ou les applications d'un **groupe d'applications** (action de données `useApplications`) | Toute gestion |
| Desktop Virtualization Host Pool, Application Group ou Workspace Contributor / Reader | Gérer / voir ce type d'objet | Créer des machines virtuelles, attribuer des utilisateurs (exige User Access Administrator) |
| Desktop Virtualization User Session Operator | Envoyer des messages, déconnecter et fermer les sessions utilisateur | Mode drainage, suppression d'hôtes, modification des paramètres du pool d'hôtes |
| Desktop Virtualization Session Host Operator | Voir et supprimer des hôtes de session, changer le mode drainage | Ajouter des hôtes dans le portail |
| Desktop Virtualization Power On Contributor | Démarrer des machines virtuelles (attribué au principal de service Azure Virtual Desktop pour Start VM on Connect) | Arrêter ou libérer |
| Desktop Virtualization Power On Off Contributor | Démarrer, arrêter, libérer, redémarrer des machines virtuelles (pour les plans de mise à l'échelle) | Créer ou supprimer des machines virtuelles |
| Desktop Virtualization Virtual Machine Contributor | Créer et remplacer les machines virtuelles hôtes de session (pour l'identité managée d'une configuration d'hôte de session) | Groupes d'applications, espaces de travail |

Pour voir les applications des groupes d'applications liés à un espace de travail, un Workspace Contributor a aussi besoin de **Desktop Virtualization Application Group Reader**.

Réponses types :

| Exigence | Attribution |
| --- | --- |
| Les utilisateurs peuvent ouvrir le bureau | Desktop Virtualization User sur le **groupe d'applications de bureau** |
| Le support déconnecte les utilisateurs bloqués d'un pool | User Session Operator sur ce **pool d'hôtes** |
| Un opérateur met des hôtes en mode drainage pour les corriger | Session Host Operator |
| Start VM on Connect fonctionne | Power On Contributor pour le principal de service Azure Virtual Desktop sur le groupe de ressources ou l'abonnement des machines virtuelles |
| Un plan de mise à l'échelle automatique peut arrêter des machines virtuelles | Power On Off Contributor pour le principal de service |
| Une équipe crée des groupes d'applications mais n'attribue jamais d'utilisateurs | Application Group Contributor |

> **Piège d'examen.** Les rôles Azure RBAC contrôlent les objets Azure, pas ce qu'un utilisateur peut faire dans Windows. Owner sur l'abonnement ne fait pas de quelqu'un un administrateur local d'un hôte de session, et Desktop Virtualization User sur un **pool d'hôtes** ne donne aucun accès : il doit être sur le groupe d'applications.

<!-- section: conditional-access | objectives: 2.1.4 -->
## Planifier et implémenter des stratégies d'accès conditionnel

L'accès conditionnel exige **Microsoft Entra ID P1** (ou P2), ne peut pas être utilisé tant que les paramètres de sécurité par défaut sont activés, et se crée au minimum par un **Conditional Access Administrator** (Protection > Accès conditionnel > Stratégies > Nouvelle stratégie).

| Paramètre de la stratégie | Valeur pour Azure Virtual Desktop |
| --- | --- |
| Utilisateurs | Un groupe contenant les utilisateurs Azure Virtual Desktop |
| Ressources cibles | **Azure Virtual Desktop** (ID d'application `9cdead84-a844-4324-93f2-b2e6bb768d07`) : abonnement au flux, passerelle, diagnostics. Avec l'authentification unique, aussi **Windows Cloud Login** (`270efc09-cd0d-444b-a71f-39af4910ec45`) : connexion à l'hôte de session |
| À ne pas cibler | **Azure Virtual Desktop Azure Resource Manager Provider** : il ne doit pas exiger l'authentification multifacteur |
| Conditions > Applications clientes | Navigateur, et Applications mobiles et clients de bureau |
| Accorder | Exiger l'authentification multifacteur (ou exiger un appareil conforme, etc.) |
| Session > Fréquence de connexion | Réauthentification périodique ; **Chaque fois** uniquement sur Windows Cloud Login avec l'authentification unique |

Structure recommandée avec l'authentification unique : deux stratégies identiques, l'une sur Azure Virtual Desktop et l'autre sur Windows Cloud Login, qui ne diffèrent que par la fréquence de connexion. **Chaque fois** sur l'application Azure Virtual Desktop provoquerait une invite à chaque actualisation du flux. Sur Windows Cloud Login, **Chaque fois** redemande l'authentification quand l'utilisateur lance une nouvelle connexion 5 à 10 minutes ou plus après sa dernière authentification.

Pour les hôtes de session **joints à Microsoft Entra**, désactivez l'authentification multifacteur par utilisateur héritée (sinon « The sign-in method you're trying to use isn't allowed »), et excluez **Azure Windows VM Sign-In** de la stratégie si vous ne voulez pas restreindre la connexion aux méthodes fortes comme Windows Hello Entreprise.

> **Conseil d'examen.** « Exiger l'authentification multifacteur quand les utilisateurs se connectent hors du réseau de l'entreprise » = une stratégie sur l'application Azure Virtual Desktop avec une condition d'emplacement qui exclut l'emplacement nommé approuvé. « Redemander à chaque ouverture d'un hôte de session » = fréquence de connexion **Chaque fois** sur **Windows Cloud Login**, ce qui exige l'authentification unique.

<!-- section: authentication-options | objectives: 2.1.5 -->
## Options d'authentification : sans mot de passe, carte à puce et authentification multifacteur

Trois phases, chacune avec ses options :

| Phase | Méthodes |
| --- | --- |
| Service (Microsoft Entra ID) | Mot de passe, authentification multifacteur via l'accès conditionnel, sans mot de passe (Windows Hello Entreprise, clés de sécurité FIDO2, Microsoft Authenticator), carte à puce via l'**authentification par certificat Microsoft Entra** ou AD FS, fournisseur tiers fédéré |
| Hôte de session (connexion Windows) | Avec l'authentification unique : toute méthode utilisée pour le service, y compris sans mot de passe. Sans authentification unique : mot de passe, ou carte à puce et approbation de certificat Windows Hello Entreprise |
| Dans la session (applications et sites web) | Sans mot de passe via la **redirection WebAuthn** (Windows Hello Entreprise ou clé FIDO2 de l'appareil local), carte à puce via la **redirection de carte à puce** |

Règles derrière les réponses d'examen :

- **Les cartes à puce et Windows Hello Entreprise sur l'hôte de session n'utilisent que Kerberos**, qui exige une visibilité directe sur le KDC d'un contrôleur de domaine. Hors du réseau de l'entreprise : VPN, ou **proxy KDC** (un serveur Windows Server 2016 ou ultérieur avec le service proxy KDC du rôle Passerelle des services Bureau à distance), déclaré sur le pool d'hôtes avec la propriété RDP `kdcproxyname:s:<fqdn>`. Le proxy KDC est pris en charge par le client Windows, pas par le client web.
- La **redirection WebAuthn** est activée par défaut sur les versions de système d'exploitation prises en charge ; désactivez-la avec `redirectwebauthn:i:0` ou la case **Redirection WebAuthn** des propriétés RDP du pool d'hôtes. Pour la connexion FIDO2 aux ressources Microsoft Entra, activez la méthode clé de sécurité FIDO2 pour les utilisateurs.
- La **redirection de carte à puce** exige aussi les pilotes de la carte sur l'hôte de session.
- La connexion sans mot de passe **à l'hôte de session lui-même** (FIDO2, clé d'accès, Authenticator) exige l'authentification unique Microsoft Entra.

```text
kdcproxyname:s:kdc.contoso.com
redirectwebauthn:i:1
redirectsmartcards:i:1
```

> **Piège d'examen.** Des utilisateurs qui se connectent au flux avec une clé FIDO2 reçoivent quand même une demande de mot de passe de l'hôte de session si l'authentification unique n'est pas configurée. La solution est l'authentification unique Microsoft Entra, pas une autre stratégie d'accès conditionnel.

<!-- section: session-host-rights | objectives: 2.1.6 -->
## Gérer les rôles, les groupes et les droits sur les hôtes de session

Dans Windows, les droits viennent des groupes locaux et des attributions de droits utilisateur, gérés selon le type de jonction :

| Besoin | Joint à AD DS ou à Microsoft Entra Domain Services | Joint à Microsoft Entra |
| --- | --- | --- |
| Se connecter comme utilisateur standard | Attribution au groupe d'applications ; utilisateur de domaine standard | Attribution au groupe d'applications plus **Virtual Machine User Login** (pools sans configuration d'hôte de session) |
| Administrateur local pour l'équipe de support | Une stratégie de groupe (groupes restreints ou préférences de stratégie de groupe) ajoute un groupe de domaine au groupe local **Administrateurs** | Rôle **Virtual Machine Administrator Login**, ou stratégie Intune de protection de compte (appartenance aux groupes d'utilisateurs locaux) ; Microsoft Entra Joined Device Local Administrator couvre tous les appareils joints |

Bonnes pratiques de privilège minimum :

- Les utilisateurs ont des droits standard ; les administrateurs utilisent des comptes distincts non administrateurs et élèvent leurs droits dans la session (Exécuter en tant qu'administrateur).
- Gérez les groupes locaux de façon centralisée (stratégie de groupe ou Intune), jamais à la main : les hôtes sont recréés à partir de l'image.

> **Piège d'examen.** Sur un hôte de session joint à Microsoft Entra, Virtual Machine Administrator Login est le rôle Azure qui accorde les droits d'**administrateur local** à la connexion. Virtual Machine Contributor gère la ressource machine virtuelle mais ne donne aucun droit de connexion.

<!-- section: single-sign-on | objectives: 2.1.7 -->
## Configurer l'authentification unique Microsoft Entra

L'authentification unique Microsoft Entra connecte les utilisateurs à Windows avec leur jeton Microsoft Entra : pas de seconde demande d'identifiants, les méthodes sans mot de passe et les fournisseurs tiers fonctionnent sur l'hôte de session, et l'accès conditionnel s'applique à la connexion à l'hôte.

Prérequis :

- Hôtes de session **joints à Microsoft Entra ou joints hybrides Microsoft Entra**. Les hôtes joints uniquement à AD DS ou à Microsoft Entra Domain Services ne sont pas pris en charge.
- Windows 11 ou Windows 10 Entreprise (session unique ou multisession) ou Windows Server 2022, avec la mise à jour cumulative d'octobre 2022 ou ultérieure.
- Rôle Application Administrator ou Cloud Application Administrator.
- Des hôtes joints hybrides dans un autre domaine que celui des utilisateurs exigent une approbation bidirectionnelle.

Étapes :

1. **Activez l'authentification Microsoft Entra pour RDP** sur le principal de service **Windows Cloud Login** : Microsoft Entra ID > Appareils > Configuration de la connexion à distance, ou définissez `isRemoteDesktopProtocolEnabled` à true avec Microsoft Graph.
2. **Masquez l'invite de consentement** : ajoutez jusqu'à **10 groupes d'appareils** (un groupe dynamique des hôtes de session est pratique ; les groupes dynamiques exigent Microsoft Entra ID P1 ou Intune for Education) comme groupes d'appareils cibles. Sinon les utilisateurs approuvent chaque nouvel hôte (mémorisé pour 15 hôtes et 30 jours).
3. **Créez un objet serveur Kerberos Microsoft Entra** dans AD DS quand les hôtes sont joints hybrides, ou quand des hôtes joints à Microsoft Entra doivent atteindre des ressources AD DS (partages SMB, authentification intégrée).
4. **Revoyez l'accès conditionnel** : ajoutez Windows Cloud Login aux stratégies.
5. **Activez l'authentification unique sur le pool d'hôtes** : Propriétés RDP > Informations de connexion > **Authentification unique Microsoft Entra**, ou la propriété ci-dessous.

```text
enablerdsaadauth:i:1
```

Avec l'authentification unique, une session verrouillée se **déconnecte** par défaut au lieu d'afficher l'écran de verrouillage distant, afin que l'accès conditionnel soit réévalué à la reconnexion.

> **Piège d'examen.** L'authentification unique ne se configure ni avec un serveur AD FS ni en enregistrant les identifiants dans le client : c'est le réglage Windows Cloud Login plus `enablerdsaadauth:i:1`. Si les hôtes sont seulement joints à AD DS, la réponse est d'abord de les rendre joints hybrides.

<!-- section: key-points -->
## Points clés

- Les utilisateurs doivent exister dans Microsoft Entra ID et utiliser la même identité pour le service et pour Windows ; les identités AD DS seules ne sont pas prises en charge.
- AD DS = visibilité directe sur les DC ; Microsoft Entra Domain Services = AAD DC Administrators et hachages de mots de passe ; cloud uniquement = hôtes joints à Microsoft Entra plus Virtual Machine User Login.
- Accès = Desktop Virtualization User sur le groupe d'applications ; les opérateurs reçoivent User Session Operator ou Session Host Operator ; le principal de service reçoit Power On (Off) Contributor.
- L'accès conditionnel cible l'application Azure Virtual Desktop, plus Windows Cloud Login avec l'authentification unique ; jamais l'application Azure Resource Manager Provider.
- Les cartes à puce et Windows Hello Entreprise sur l'hôte utilisent Kerberos : proxy KDC depuis l'extérieur ; redirection WebAuthn pour le sans mot de passe dans la session.
- L'authentification unique exige des hôtes joints à Microsoft Entra ou joints hybrides, l'authentification RDP activée sur Windows Cloud Login et `enablerdsaadauth:i:1`.
