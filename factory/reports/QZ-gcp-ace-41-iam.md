# QZ-gcp-ace-41-iam — report

File: `content/gcp-ace/quizzes/41-iam.yaml` (10 questions, 8 single + 2 multi; 4.1.1 ×4, 4.1.2 ×3, 4.1.3 ×3). Check: 0 problem(s), 0 warning(s).

## Decisions kept away from the mock exam
The bank already has about 38 questions on 4.1.x, which cover most of the chapter's decisions. The quiz uses others: `allUsers` vs `allAuthenticatedUsers`, predefined roles as the default, `DEPRECATED` vs `DISABLED` stage, Deny Admin (Owner/Admin don't include deny permissions), `add-iam-policy-binding` vs `set-iam-policy` with a partial file, Private Logs Viewer at folder level, `get-ancestors-iam-policy --include-deny`, a conditional binding that doesn't override an unconditional one, causes of access that remains after a binding is removed, and a role deleted 10 days ago (no undelete, role ID still reserved).

## Chapter issues against current docs (not edited)
- **Public principals**: "IAM principals" (fetched 2026-11-27) says that organizations created on or after 2024-05-03 don't allow granting roles to `allUsers` / `allAuthenticatedUsers` by default (managed constraint `iam.managed.allowedPolicyMembers`). The chapter lists these identifiers without this default. Worth an exam trap. (Q1 states that no organization policy blocks public access.)
- **Custom role deletion**: the docs say permanent deletion is scheduled 7 to 14 days after the request and takes 30 days, and the role ID can be reused once that is done, up to 44 days after the request. The chapter's "can't be reused until 44 days after the deletion request" is close but reads as a fixed delay.
- **Conditions**: the chapter says correctly that a conditional binding doesn't override an unconditional binding of the same role. The docs also recommend no more than 100 conditional bindings per allow policy (best practice, not a hard limit), which the chapter doesn't mention.
- **Deny Admin**: the "Deny access to resources" page names Deny Admin on the organization, and Deny Reviewer (`roles/iam.denyReviewer`) for viewing only. The chapter doesn't mention Deny Reviewer.

## Doubts / unverified
- Not verified, and not used in the quiz: the chapter's descriptions of Compute Network Admin vs Compute Security Admin (the roles reference page is too large to fetch), and its claim that Owner can't be granted with gcloud to a user outside the organization.
- Private Logs Viewer at folder level: the Logging access control page says predefined roles can be granted at a higher level "in most cases"; it doesn't say so explicitly for this role, but Q6 relies on it (standard practice).
