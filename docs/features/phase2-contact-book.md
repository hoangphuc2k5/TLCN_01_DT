# Phase 2.3 - So lien lac dinh ky (6.2.3)

Branch: `feat/phase2-contact-book`, based on `feat/phase2-online-assignments`.

- Added `ContactBookEntry` for weekly/monthly/term records per student, with academic, attendance, conduct and teacher notes.
- Teachers can create/update drafts only for assigned classes (homeroom membership is also supported), then publish them. School administrators and academic affairs can manage records inside their school.
- Students and parents see published records only; parents can reply on their child's record. Tenant and parent-child scope is checked on every read/write.
- Added permission resource `contact_books`, API `/v1/api/contact-books`, React page `/contact-book`, fixture data and Playwright coverage.

Validation: `node --test test/contact-book.test.js` **3/3**; full backend **175/175**, frontend policy **10/10**, production build passed, dedicated E2E **1/1**, full E2E **32/32**.

The next planned extension is a richer class activity and online parent-meeting workflow (6.2.5-6.2.6); this branch covers the periodic contact book slice.
