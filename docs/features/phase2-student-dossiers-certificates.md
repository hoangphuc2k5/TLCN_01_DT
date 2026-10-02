# Phase 2.10 - Ho so scan va chung nhan dien tu (5.4-5.5)

Branch: `feat/phase2-student-dossiers-certificates`.

- Added `StudentDocument` and extended private `FileAsset` storage with purpose `STUDENT_DOCUMENT`.
- School/cluster/academic staff can upload scanned identity, birth certificate, transcript, health and other documents. Files use the existing quota reservation and local/S3 storage adapters.
- Students and parents can list/download only their own records or linked children. Staff access remains school/cluster scoped; a requested foreign `studentId` is intersected with the personal scope instead of replacing it.
- Added transcript export from electronic grades, conduct records and approved reward/discipline records. PDF is generated without a new runtime dependency; Word export is a Word-compatible RTF (`.doc`) response.
- API: `POST /student-documents/upload`, `GET /student-documents`, `GET /student-documents/:id/download`, `GET /students/:studentId/certificate/:format` (`pdf`, `doc`). React page: `/student-documents`.

Validation:

- `cd ExpressJS; node --test test/student-dossiers-certificates.test.js` -> **2/2**.
- `cd ReactJS; npm run build` -> passed (existing large chunk warning remains).
