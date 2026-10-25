const ImportContext = require('./import/context');
const ImportUserHandlers = require('./import/users.handlers');
const ImportGradeHandlers = require('./import/grades.handlers');
const ImportFeeHandlers = require('./import/fees.handlers');
const ImportAttendanceHandlers = require('./import/attendance.handlers');
const ImportExamHandlers = require('./import/exams.handlers');

function createImportService(dependencies) {
  const context = new ImportContext(dependencies);
  const handlerDependencies = { context };
  const userHandlers = new ImportUserHandlers(handlerDependencies);
  const gradeHandlers = new ImportGradeHandlers(handlerDependencies);
  const feeHandlers = new ImportFeeHandlers(handlerDependencies);
  const attendanceHandlers = new ImportAttendanceHandlers(handlerDependencies);
  const examHandlers = new ImportExamHandlers(handlerDependencies);

  return {
    TEMPLATES: context.TEMPLATES,
    buildTemplateBuffer: context.buildTemplateBuffer,
    ...userHandlers,
    ...gradeHandlers,
    ...feeHandlers,
    ...attendanceHandlers,
    ...examHandlers,
  };
}

class ImportService {
  constructor(dependencies) {
    Object.assign(this, createImportService(dependencies));
  }
}

module.exports = ImportService;
