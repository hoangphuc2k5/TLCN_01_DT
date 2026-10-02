# Phase 2.5 - Sinh hoat lop va hop phu huynh online (6.2.5-6.2.6)

Branch: `feat/phase2-parent-meetings`, based on `feat/phase2-contact-book`.

- `ClassActivity`: draft/publish, scheduled time, agenda and class scope.
- `ParentMeeting`: scheduled/cancelled/completed state, online URL, agenda and class scope.
- `ParentMeetingResponse`: unique parent RSVP (`GOING`, `MAYBE`, `DECLINED`) with optional note.
- Teachers are limited to assigned classes; school administrators and academic affairs are limited to their school. Parents and students only see their own class records.
- Added permission resources, API routes, React page `/class-life`, isolated fixture data and Playwright coverage.

Validation: dedicated backend **2/2**, frontend policy **10/10**, production build passed, dedicated E2E **1/1**. Full backend regression passed after adding the two scenarios.

The core scheduling, publishing and RSVP flow is complete. Video provider integration, meeting attendance and file based minutes remain follow-up enhancements.
