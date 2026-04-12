# Contribution Rules

- Follow DDD and ports/adapters boundaries.
- Place business logic inside the owning bounded context only.
- Treat `ProjectAssignment` as internal truth.
- Treat `WorkEvidence` as a separate fact model.
- Use configuration or metadata for variable business dictionaries.
- Add or update architecture docs when boundaries change.
- Prefer additive API changes to preserve compatibility.
