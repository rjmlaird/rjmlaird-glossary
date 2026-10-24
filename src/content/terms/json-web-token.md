---
term: "JSON Web Token (JWT)"
category: web-architecture
aliases: ["JWT"]
short: "A JSON Web Token is a compact, signed token that carries claims, such as a user identity and expiry time, as JSON, defined in RFC 7519."
related: ["oauth", "authentication"]
updated: 2026-10-24
---

It has three base64url-encoded parts: header, payload and signature. The payload is readable by anyone holding the token unless it is also encrypted, so it should not carry secrets.
