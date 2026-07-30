# Project Decision Rules

These rules apply to frontend, mobile, backend, and documentation work in this
repository.

## Product and Architecture Decisions

- Do not treat the strictest security option as automatically being the most
  professional product choice.
- Before implementing a cross-cutting or user-facing flow such as
  authentication, account recovery, payments, destructive actions, data
  ownership, or notifications:
  1. Compare the established implementation patterns used by current,
     reputable products and the official provider documentation.
  2. Evaluate the actual threat model, product type, user friction,
     recoverability, and future requirements.
  3. Present the meaningful alternatives, tradeoffs, and a concrete
     recommendation to the user before implementation.
  4. Record the approved decision in the relevant contract or system-design
     document and protect it with tests.
- A technically secure implementation can still be the wrong product decision
  when it creates avoidable friction. Security and UX must be evaluated
  together.
- Do not wait for the user to identify a common industry pattern that should
  have been considered during the initial analysis.

## Approved Google Authentication Decision

Word App is a consumer learning application. Its approved Google
authentication behavior is verified-email automatic account linking:

- Never infer Google ownership from an email address or from the `gmail.com`
  domain.
- The API must verify the Google ID token, including issuer, audience,
  signature, expiration, immutable `sub`, and `email_verified`.
- If the exact normalized, Google-verified email belongs to an existing,
  active, email-verified password account, the API may atomically attach the
  Google identity and authenticate that same user.
- Automatic linking must be rejected if the Google `sub` is already attached
  to another user, the email is unverified, the local account is unverified,
  blocked, or deleted, or identity ownership is otherwise ambiguous.
- Account linking must be race-safe and must never create duplicate users or
  identities.
- Explicit reauthentication or manual linking is reserved for conflicts,
  higher-risk accounts, and future MFA-sensitive cases. It is not a required
  step in the normal matching-email login flow.
- Profile UI may show and manage connected sign-in methods, but users must not
  be forced through Profile merely to use Google after registering with the
  same verified email.

