# Optimistic concurrency control on every change

Every flag has a `version`, and every change (toggle, edit, delete) must say which version it's based on. The write is a single `UPDATE ... WHERE id = ? AND version = ?`, so check and write can't be interleaved. A stale version gets `409 version_conflict` with the flag's current state, which the UI shows instead of silently overwriting someone else's change. For a lone boolean, last-write-wins would mostly be harmless, but with editable fields lost updates become real data loss, and adding versioning later would break the API contract.

## Considered Options

- **`ETag` / `If-Match` → `412`**: more HTTP-native, but the list endpoint can't carry per-item ETags, so clients would read versions from bodies anyway. The version travels in the body (and in the query string for `DELETE`, whose bodies aren't reliably supported).
- **SQLAlchemy's `version_id_col`**: raises on a stale write but doesn't give back the current row, which the 409 response needs.
- **Pessimistic locks**: you can't hold a database lock across a user thinking in a browser.
