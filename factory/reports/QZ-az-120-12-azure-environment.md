# QZ-az-120-12-azure-environment — end-of-chapter quiz, AZ-120, chapter 12

File: `content/az-120/quizzes/12-azure-environment.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-120 12-azure-environment` → 0 problem(s), 0 warning(s).

| # | Objective | Difficulty | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 1.2.4 | 1 | single | SAP IDM end of maintenance → Microsoft Entra ID Governance |
| 2 | 1.2.2 | 1 | single | Audit a setting inside the guest OS → Azure Policy machine configuration |
| 3 | 1.2.3 | 2 | single | App calling OData as the user → OAuth 2.0 SAML bearer grant (SOAUTH2) |
| 4 | 1.2.1 | 2 | multi (3) | ACSS registration with a new UAMI: administrator + Managed Identity Operator + Managed Identity Contributor |
| 5 | 1.2.6 | 2 | single | Terraform + Ansible, AnyDB, central control plane → SAP Deployment Automation Framework |
| 6 | 1.2.2 | 3 | single | Time-bound exception for one definition of an initiative without touching the assignment → Waiver exemption with expiresOn |
| 7 | 1.2.4 | 3 | yesno | SCIM provisioning to SAP Cloud Identity Services: Default Access excluded, SSO independent, groups need P1 |
| 8 | 1.2.3 | 3 | ordering | SAML SSO for SAP NetWeaver: SICF → SAML2 local provider → Entra gallery app → trusted provider → identity federation |
| 9 | 1.2.5 | 3 | multi | Moving a subscription between management groups: inheritance, Owner direct vs inherited, root exception, 30-min delay |
| 10 | 1.2.1 | 3 | dropdown | Basis access: VM Contributor (non-prod), custom role + eligible PIM (prod), multi-user authorization with Resource Guard |

Pages fetched (2026-11-24): entra/id-governance scenarios/migrate-from-sap-idm and privileged-identity-management/pim-configure; governance machine-configuration/overview, policy/concepts/exemption-structure, policy/concepts/scope, management-groups/manage; entra/identity/saas-apps sap-netweaver-tutorial and sap-cloud-platform-identity-authentication-provisioning-tutorial; sap/center-sap-solutions manage-with-azure-rbac, overview, deploy-s4hana; sap/automation/deployment-framework; backup/multi-user-authorization-concept; role-based-access-control/built-in-roles/compute; CAF scenarios/sap/eslz-identity-and-access-management (deprecated, not referenced).

## Doubts and unverified facts

- Q1: the Learn page documents migration from SAP IDM "to Microsoft Entra"; "SAP's most recommended successor Microsoft Entra ID Governance" appears only in a partner description on that page. The page sits in the ID Governance docs, so the answer is defensible; the end-of-maintenance year (2027) is only in a linked SAP blog URL.
- Q9: the move permissions (Owner direct vs inherited, Contributor on target, write on the current parent, root exception, 30-minute cache) come from the management groups "manage" page, not from the chapter. They are within the study-guide objective ("implement a management hierarchy") but go beyond chapter 12; consider adding one line to the chapter.
- Q10: the production rule ("custom role, eligible PIM assignment") relies on the CAF SAP identity page, which is marked deprecated with removal on 2026-10-30 but is still served; the question references the PIM and MUA pages instead. Multi-user authorization with Resource Guard isn't on any SAP-specific page I fetched (the chapter states it).
- Q10: the claim that Contributor/Owner manage virtual networks and that Virtual Machine Contributor doesn't is from the built-in roles page (VM Contributor: "doesn't grant management access to the virtual network").
- Q3: the tutorial's OAuth section registers the client with the SAML bearer grant but its token-request example shows client_credentials; the question relies on the grant type configured in SOAUTH2, as the chapter does.

## Chapter issues against current Learn

- Section 1.2.3, Windows guest OS row: "Microsoft Entra Domain Services is documented as still being tested". The supported-scenarios page is self-contradictory: its text says "still in testing" but its table marks Microsoft Entra Domain Services "Supported". The mock question az120-1a-sup-windows-ad uses "Supported" as the correct answer; chapter and bank should be aligned.
- Section 1.2.1 and 1.2.6 rely on CAF SAP landing zone pages (eslz-identity-and-access-management, enterprise-scale-landing-zone) that are deprecated with removal announced for 2026-10-30; they are still served today, but the chapter should move to the SAP on Azure architecture or product pages when they disappear.
- Section 1.2.1: "Production: a custom role limited to the operations Basis needs" — the CAF page says "partially elevated administration access, like partial Virtual Machine Contributor"; "custom role" is the chapter's interpretation (reasonable).
- Section 1.2.2 table: machine configuration effect `auditIfNotExists` and Update Manager effects are not on the machine configuration overview (it describes Audit / Apply and Monitor / Apply and Autocorrect modes); not tested as such.
