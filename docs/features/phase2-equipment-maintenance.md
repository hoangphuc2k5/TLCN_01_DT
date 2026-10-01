# Phase 2.12 - Bao tri thiet bi chi tiet (10.4)

Branch: `feat/phase2-equipment-maintenance`.

- Added `EquipmentAsset` inventory with code, serial number, location, quantity, warranty, status and notes.
- Added `EquipmentMaintenance` tickets with issue details, priority, estimated/final cost and OPEN -> IN_PROGRESS -> RESOLVED/CANCELLED workflow.
- Reporting a maintenance issue automatically marks the equipment as `MAINTENANCE`; resolving/cancelling the last open ticket returns it to `AVAILABLE`.
- Inventory is restricted to school/cluster/academic/library managers; teachers can report issues and managers can update them.
- API: `GET/POST/PUT /equipment`, `GET/POST /equipment-maintenance`, `PATCH /equipment-maintenance/:id`. React page: `/equipment-maintenance`.

Validation:

- `cd ExpressJS; node --test test/equipment-maintenance.test.js` -> **1/1**.
- `cd ReactJS; npm run build` -> passed (existing large chunk warning remains).
