# Phase 2.4 - Sinh hoat lop va hop phu huynh online (6.2.5-6.2.6)

Branch: `feat/phase2-parent-meetings`, based on `feat/phase2-contact-book`.

- Added `ClassActivity` for scheduled class activities with agenda/minutes and draft/published lifecycle.
- Added `ParentMeeting` with class/year, online URL, agenda, minutes and scheduled/cancelled/completed status.
- Added `ParentMeetingResponse` with unique parent RSVP (GOING/MAYBE/DECLINED) and optional note.
- Teachers can create/publish activities and schedule meetings for assigned classes; school administrators and academic affairs are scoped to their school.
- Students/parents only see activities and meetings for their class; parents can RSVP and update their response.
- Added permissions, API routes, React page `/class-life`, fixture data, backend tests and Playwright coverage.

Validation: class-life backend **2/2**, full frontend policy **10/10**, production build passed, dedicated E2E **1/1**. Full backend/E2E regression should be run before merge.

This covers the core scheduling, publishing and RSVP flow. Video-provider integration, attendance tracking and post-meeting file minutes remain follow-up work.
