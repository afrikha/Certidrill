Le portail Defender rassemble les alertes de toutes les charges de travail de sécurité Microsoft dans une seule file d'attente. Ce chapitre couvre, charge de travail par charge de travail, ce que vous examinez et quelle action de correction vous prenez : e-mail, protection contre la perte de données et risque interne, charges de travail cloud, applications SaaS, identités Microsoft Entra et Active Directory local. Les questions d'examen citent une alerte et demandent l'action suivante, l'outil à utiliser ou le rôle requis.

<!-- section: defender-office-365 | objectives: 2.1.1 -->
## Defender pour Office 365 et interruption automatique des attaques

Avec Defender pour Office 365 Plan 2, les e-mails malveillants arrivés dans les boîtes aux lettres sont supprimés soit par le système (purge automatique zéro heure, ZAP), soit par les analystes au moyen d'**actions de correction**.

| Action | Résultat |
| --- | --- |
| Move to junk folder / Move to inbox / Move to deleted items | Déplace le message vers ce dossier (Move to inbox récupère un faux positif) |
| Soft delete | Déplace vers Éléments récupérables\Suppressions ; l'utilisateur et les administrateurs peuvent le récupérer |
| Delete sender's copy | Supprime aussi de façon réversible la copie dans les Éléments envoyés de l'expéditeur interne |
| Hard delete | Purge le message (les administrateurs peuvent encore le récupérer avec la récupération d'élément unique) |

Où agir : **Threat Explorer** (toute vue : Malware, Phish, All email), le **repérage avancé** (Take actions sur des résultats de `EmailEvents`) et l'**enquête et réponse automatisées (AIR)**, dont les actions recommandées attendent une approbation. Limites de sélection : 100 e-mails choisis à la main, jusqu'à 200 000 par requête ; corrigez par lots de 50 000 au plus ; 50 corrections simultanées au maximum par organisation.

| Modèle d'approbation | Comment |
| --- | --- |
| Approbation directe | Un utilisateur doté du rôle **Search and Purge** exécute l'action immédiatement |
| Approbation en deux étapes | Un utilisateur sans ce rôle sélectionne « add to remediation » ; un utilisateur autorisé l'approuve dans **Actions et envois > Centre de notifications > En attente** |

Avec le RBAC unifié, l'approbation exige **Email & collaboration advanced actions (manage)**, et la suppression définitive exige aussi **Email & collaboration content (read)**. Sinon, utilisez les groupes de rôles Organization Management ou Data Investigator, ou un groupe de rôles personnalisé avec Search and Purge. Le Centre de notifications (Action center) affiche les actions de correction sur 30 jours (**En attente**, **Historique**).

```kusto
EmailEvents
| where Timestamp > ago(2d)
| where SenderFromDomain == "fabrikam-invoices.com"
| project Timestamp, NetworkMessageId, RecipientEmailAddress, Subject, DeliveryLocation, LatestDeliveryAction
```

L'**interruption automatique des attaques** intervient quand Defender XDR corrèle des signaux d'e-mail, d'identités, de points de terminaison et d'applications SaaS en une attaque à haut niveau de confiance, comme une compromission de messagerie professionnelle (BEC) lancée depuis un compte compromis. Elle contient les ressources de l'attaquant : désactivation de l'utilisateur (Defender pour Identity, sur les contrôleurs de domaine dotés du capteur, et dans Microsoft Entra ID pour les comptes synchronisés ou cloud), révocation de la session et suspension de l'utilisateur dans Microsoft Entra ID, confinement de l'utilisateur et de l'appareil (Defender for Endpoint). L'incident porte la balise **Attack Disruption** et un bandeau jaune, et le graphe affiche l'état des ressources (compte désactivé, appareil confiné). Chaque action est journalisée dans le Centre de notifications et peut être annulée par le SOC.

> **Piège d'examen.** L'interruption automatique des attaques confine les comptes et les appareils ; elle ne remplace pas la correction des e-mails. Après l'incident, vous supprimez encore les messages d'hameçonnage avec Threat Explorer ou les actions AIR, et vous ne libérez un utilisateur ou un appareil confiné qu'après avoir atténué le risque et terminé l'enquête.

<!-- section: purview-alerts | objectives: 2.1.2 -->
## Microsoft Purview : protection contre la perte de données et risque interne

Les **alertes DLP** sont générées quand une règle de stratégie DLP correspond et que ses rapports d'incident sont configurés pour générer des alertes. Elles s'examinent dans le portail Defender (incidents conservés 6 mois) ou dans le tableau de bord des alertes DLP de Purview (30 jours). Dans la file d'attente des incidents, filtrez sur **Sources de service/détection > Microsoft Data Loss Prevention** ; l'alerte affiche la stratégie, l'onglet **Sensitive info types** et, avec l'autorisation adéquate, l'onglet **Source** avec le contenu du fichier.

Depuis début octobre 2026, une règle de réglage d'alerte intégrée transforme les signaux DLP en **comportements** dans Defender XDR : ils ne créent plus d'alertes et n'apparaissent plus dans la file d'attente des incidents, mais restent dans les tables `BehaviorInfo` et `BehaviorEntities` (toutes deux en préversion). Pour les revoir sous forme d'alertes, désactivez cette règle dans **Paramètres > Microsoft Defender XDR > Réglage des alertes**.

| Autorisation | Alertes visibles |
| --- | --- |
| Manage Alerts, View-Only Manage Alerts | Alertes DLP et de sécurité |
| Information Protection Analyst, DLP Compliance Management, View-Only DLP Compliance Management | Alertes DLP uniquement |

Correction depuis l'alerte : pour les fichiers SharePoint et OneDrive, appliquer une étiquette de rétention ou de confidentialité, annuler le partage, supprimer ou télécharger (rôle Data Classification Content Viewer) ; pour un e-mail, télécharger le message. Chassez avec `CloudAppEvents`, qui contient les données d'audit de Purview (jusqu'à 30 jours) une fois Microsoft 365 connecté à Defender pour les applications cloud. Les restrictions d'unités administratives s'appliquent : un administrateur restreint ne voit que les alertes de son unité.

Les alertes de **gestion des risques internes** apparaissent dans les files d'attente des incidents et des alertes (filtre **Source de service > Microsoft Purview Insider Risk Management**) une fois **Share user risk details with other security solutions** activé dans les paramètres de partage de données de la gestion des risques internes. Les alertes d'un même utilisateur sont corrélées dans un seul incident. Pour les voir, il faut un groupe de rôles Insider Risk Management (Insider Risk Management, Analysts, Investigators). L'état et la classification se synchronisent avec Purview en 30 minutes : True positive devient Confirmed ; Benign positive et False positive deviennent Dismissed. Chassez dans `DataSecurityEvents` et `DataSecurityBehaviors` (toutes deux en préversion) ; poursuivez la réponse dans le portail Purview.

> **Piège d'examen.** Une alerte DLP qui « n'apparaît plus dans la file d'attente des incidents » après octobre 2026 n'est pas perdue : cherchez le comportement, ou désactivez la règle de réglage intégrée.

<!-- section: defender-for-cloud | objectives: 2.1.3 -->
## Protections des charges de travail de Defender pour le cloud

Quand Defender pour le cloud est activé avec ses plans de protection des charges de travail (serveurs, stockage, SQL, conteneurs, Key Vault...), toutes ses alertes et tous ses incidents apparaissent dans le portail Defender, sans doublon, avec la **ressource cloud** (Azure, AWS ou Google Cloud) comme ressource impactée. Les alertes informationnelles ne sont pas intégrées. La visibilité s'étend à tout le locataire ; filtrez par **ID d'abonnement de l'alerte**. Sans RBAC unifié, la consultation exige Security Administrator ou Global Administrator.

| Changement d'état effectué dans | Alerte Defender pour le cloud | Alerte Defender for Endpoint sur une machine virtuelle cloud |
| --- | --- | --- |
| Defender pour le cloud | Synchronisé dans les deux sens | Non synchronisé vers Defender XDR |
| Defender XDR | Synchronisé dans les deux sens | Non synchronisé vers Defender pour le cloud |

Répondre dans Defender pour le cloud : ouvrez l'alerte, **Afficher tous les détails**, puis l'onglet **Prendre des mesures** :

1. **Inspect resource context** : les journaux d'activité autour de l'alerte.
2. **Mitigate the threat** : étapes de correction manuelles.
3. **Prevent future attacks** : recommandations de sécurité pour renforcer la ressource.
4. **Trigger automated response** : exécuter une application logique.
5. **Suppress similar alerts** : créer une règle de suppression pour une activité bénigne.

Passez l'alerte à l'état **Ignorée (Dismissed)** une fois terminé. Tables de chasse : `CloudAuditEvents` (plan de contrôle Azure Resource Manager et Kubernetes), `CloudProcessEvents` et `CloudStorageAggregatedEvents` (toutes deux en préversion).

> **Conseil d'examen.** Espace de travail Sentinel avec intégration Defender XDR et incidents Defender pour le cloud en double : déconnectez le connecteur **Subscription-based Microsoft Defender for Cloud (Legacy)** et désactivez les règles qui créent des incidents à partir de ces alertes. Le connecteur **Tenant-based Microsoft Defender for Cloud** est en préversion et, dans le portail Defender, il n'est pas listé, car Defender XDR ingère déjà ces alertes.

<!-- section: defender-cloud-apps | objectives: 2.1.4 -->
## Defender pour les applications cloud

Defender pour les applications cloud détecte les comportements à risque dans les applications SaaS connectées (détections d'anomalies avec une période d'apprentissage de sept jours pour la plupart), les applications OAuth à risque et le Shadow IT. Depuis juin 2025, les anciennes stratégies d'anomalie migrent vers un modèle de détection dynamique des menaces ; par exemple, Activity from anonymous IP address devient Activity from a TOR IP address et Anonymous proxy activity.

| Alerte | Réponse typique en cas de vrai positif |
| --- | --- |
| Impossible travel, Activity from infrequent country | Suspendre l'utilisateur, le marquer compromis, réinitialiser le mot de passe ; pour un faux positif dû au VPN de l'entreprise, ajouter et étiqueter sa plage IP |
| Suspicious email forwarding rule created by third-party app (anciennement Suspicious inbox forwarding), Suspicious inbox manipulation rule (désactivée et migrée vers le modèle dynamique ; réactivable dans Policy management) | Suspendre l'utilisateur, réinitialiser le mot de passe, supprimer la règle ; vérifier le suivi des messages Exchange |
| Unusual file download, share or deletion (by user), Ransomware activity | Suspendre l'utilisateur, le marquer compromis, réinitialiser le mot de passe ; récupérer les fichiers si nécessaire |
| Misleading OAuth app name, Unusual ISP for an OAuth app | Examiner les autorisations et les utilisateurs qui ont consenti, interdire l'application ou révoquer ses jetons |
| Activity performed by terminated user | Désactiver l'utilisateur et les applications auxquelles il accède encore |

Classez chaque alerte en vrai positif, vrai positif bénin (test d'intrusion, action autorisée) ou faux positif.

| Action de gouvernance | Portée |
| --- | --- |
| Suspend user, Require user to sign in again | Compte ; la reconnexion révoque les jetons d'actualisation et les cookies de session |
| Confirm user compromised | Passe le risque utilisateur à élevé, ce qui déclenche les stratégies de risque de Microsoft Entra ID |
| Put in user quarantine / admin quarantine, Remove external users, Make private, Apply sensitivity label, Trash | Fichier |
| Ban app, Revoke app | Application OAuth ; dans Microsoft 365, l'interdiction bloque les autorisations de l'application tierce |

Le **journal de gouvernance** (Cloud Apps > Journal de gouvernance) enregistre chaque action manuelle ou automatique et son résultat, et permet de relancer ou d'annuler certaines d'entre elles. Les stratégies de fichiers sont retirées le 6 janvier 2027 ; la protection des fichiers passe à Purview DLP et à l'étiquetage automatique.

> **Piège d'examen.** Suspend user sur un compte synchronisé depuis Active Directory local est annulé par la synchronisation suivante. Désactivez plutôt le compte en local (ou avec Defender pour Identity).

<!-- section: entra-id-protection | objectives: 2.1.5 -->
## Identités compromises dans Microsoft Entra ID

Microsoft Entra ID Protection (toutes les fonctionnalités avec Microsoft Entra ID P2 ou Microsoft Entra Suite) calcule le **risque de connexion** et le **risque utilisateur**. Dans le portail Defender, filtrez les alertes sur **Nom du produit : AAD Identity Protection** ; les rapports des utilisateurs à risque, des connexions à risque et des détections de risques se trouvent dans le Centre d'administration Microsoft Entra. Global Reader est le rôle le moins privilégié pour les consulter.

```kusto
SigninLogs
| where TimeGenerated > ago(7d)
| where RiskLevelDuringSignIn in ("medium", "high")
| project TimeGenerated, UserPrincipalName, IPAddress, Location, RiskLevelDuringSignIn, RiskState
```

| Action d'administrateur | État du risque après | Qui |
| --- | --- | --- |
| Réinitialiser le mot de passe (mot de passe temporaire) | Corrigé (Remediated) | Security Operator plus User Administrator |
| Exiger un changement de mot de passe | Corrigé une fois que l'utilisateur l'a changé | L'administrateur demande, l'utilisateur effectue |
| Ignorer le risque | Ignoré (Dismissed), mot de passe inchangé | Security Operator |
| Confirmer la compromission | Compromission confirmée | Administrateur, depuis les utilisateurs ou les connexions à risque |

Après **Confirmer la compromission**, contenez le compte : demandez un changement de mot de passe, bloquez l'utilisateur si l'attaquant pouvait le réinitialiser ou passer l'authentification multifacteur, révoquez les jetons d'actualisation, désactivez les appareils compromis, révoquez les jetons d'accès avec l'évaluation continue de l'accès.

Correction autonome : l'accès conditionnel basé sur les risques exige l'authentification multifacteur pour le risque de connexion et un **changement de mot de passe sécurisé** pour le risque utilisateur. Pour les utilisateurs hybrides, **Allow on-premises password change to reset user risk** (exige la synchronisation du hachage de mot de passe) permet à un changement local de corriger le risque. Les détections de vol de jeton (Anomalous token, Attacker in the Middle, Token issuer anomaly...) ne sont plus corrigées automatiquement par la seule authentification multifacteur.

> **Piège d'examen.** Ignorer le risque ne sécurise pas le compte : le mot de passe reste le même. Si le compte a vraiment été compromis, réinitialisez plutôt le mot de passe et révoquez les sessions.

<!-- section: defender-for-identity | objectives: 2.1.6 -->
## Alertes de Defender pour Identity

Les capteurs Defender pour Identity des contrôleurs de domaine (et des serveurs AD FS, AD CS, Microsoft Entra Connect) détectent les attaques contre Active Directory local. Les alertes classiques sont regroupées en reconnaissance et découverte, persistance et élévation de privilèges, accès aux informations d'identification, mouvement latéral et autres.

| Alerte (nom classique) | Attaque |
| --- | --- |
| Account Enumeration reconnaissance (LDAP), Security principal reconnaissance (LDAP), Network-mapping reconnaissance (DNS) | Découverte |
| Suspected Kerberos SPN exposure, Suspected AS-REP Roasting attack | Cassage hors ligne de tickets de service ou d'utilisateur |
| Suspected DCSync attack (replication of directory services) | Réplication des hachages de mots de passe depuis une machine qui n'est pas un contrôleur de domaine |
| Suspected Golden Ticket usage, Suspected skeleton key attack | Tickets falsifiés, persistance dans le domaine |
| Honeytoken authentication activity | Utilisation d'un compte leurre |

Triez chaque alerte : vrai positif, vrai positif bénin (test d'intrusion, outil approuvé) ou faux positif ; vérifiez si les ordinateurs déclencheurs ont un rôle commun. Le réglage dépend du format de l'alerte : les alertes classiques utilisent **Paramètres > Identités > Entités exclues**, les alertes au format Defender utilisent les règles de réglage des alertes.

```kusto
IdentityLogonEvents
| where Timestamp > ago(1d)
| where ActionType == "LogonFailed"
| summarize Failures = count() by AccountUpn, DeviceName, Protocol
| where Failures > 50
```

| Action de correction | Sources |
| --- | --- |
| Disable / Enable | Active Directory, Microsoft Entra ID et plusieurs fournisseurs d'identité tiers |
| Force password change | Active Directory, Microsoft Entra ID |
| Revoke session | Microsoft Entra ID, Okta |
| Mark as compromised | Microsoft Entra ID |

Les actions se prennent depuis la page ou le volet latéral de l'identité, le repérage avancé ou le Centre de notifications, et exigent un rôle personnalisé de RBAC unifié avec **Response (manage)**. Sur Active Directory, le capteur d'un contrôleur de domaine les exécute avec le compte système local du contrôleur de domaine (**Automatically use the sensor's local system account**) ; les capteurs d'AD FS, AD CS ou Microsoft Entra Connect ne font pas de correction.

<!-- section: key-points -->
## Points clés

- Correction des e-mails : Threat Explorer, repérage avancé ou AIR ; rôle Search and Purge pour approuver ; approbations en deux étapes dans le Centre de notifications.
- L'interruption automatique des attaques confine automatiquement utilisateurs et appareils ; ses actions sont réversibles depuis le Centre de notifications.
- Les signaux DLP sont devenus des comportements en octobre 2026 ; désactivez la règle de réglage intégrée pour retrouver les alertes.
- Les alertes de risque interne exigent le partage de données activé et un groupe de rôles Insider Risk Management.
- Alertes Defender pour le cloud : visibles pour tout le locataire dans le portail Defender, onglet Prendre des mesures, déconnexion du connecteur Sentinel hérité et désactivation des règles d'incidents contre les doublons.
- Defender pour les applications cloud : suspendre, marquer compromis, réinitialiser le mot de passe ; journal de gouvernance pour chaque action.
- Entra ID Protection : ignorer le risque ne change pas le mot de passe ; confirmer la compromission puis contenir.
- Defender pour Identity : le réglage dépend du format de l'alerte ; la correction exige Response (manage) et passe par les capteurs des contrôleurs de domaine.
