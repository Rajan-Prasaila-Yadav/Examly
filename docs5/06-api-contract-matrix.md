# API contract matrix

Source-only audit; no legacy documentation was consulted.

| Area | Client contract | Fastify status | Verification |
|---|---|---|---|
| Subjects | `GET`/`POST /subjects/batch/:batchId`, `PUT /subjects/reorder`, `DELETE /subjects/:id` | Implemented in `subjects.routes.ts` | API TypeScript build passes |
| Lessons | `POST /lessons/subject/:subjectId`, `PUT /lessons/reorder` | Implemented in `lessons.routes.ts` | API TypeScript build passes |
| Video, notes, resources | Nested lesson mutations | Registered in `lessons.routes.ts` | PASS: real admin create/read/persistence/cleanup verified |

No database-backed result is marked verified.
