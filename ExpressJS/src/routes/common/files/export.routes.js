
const controller = require('../../../controllers/common/files/export.controller');

const register1 = router => {
  router.get('/export/grades', controller.exportGrades);
  router.get('/export/fees', controller.exportFees);
  router.get('/export/attendance', controller.exportAttendance);
};

module.exports = { register1 };
