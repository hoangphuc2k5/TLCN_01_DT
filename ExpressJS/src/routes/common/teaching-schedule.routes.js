const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { ROLES } = require("../../config/constants/roles.config");
const controller = require('../../controllers/common/teaching-schedule.controller');

const register1 = router => {
  router.get('/timetables/schedule', authorizeRead('timetable', { personal: true, personalRoles: [ROLES.STUDENT, ROLES.PARENT, ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] }), controller.datedSchedule);
};

module.exports = { register1 };
