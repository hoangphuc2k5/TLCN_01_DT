/** Database operations for admin-extra; dependencies are wired in config/container.js. */
class AdminExtraRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listAuditLogsFind(arg1, arg2, arg3) {
    return this.models["audit-log"].find(arg1).populate('actorId', 'name email role').sort(arg2).limit(arg3);
  }

  listTicketsFind(arg1, arg2) {
    return this.models["support-ticket"].find(arg1).populate('createdBy', 'name email').populate('schoolId', 'name').populate('assignedTo', 'name').sort(arg2);
  }

  createTicketCreate(arg1) {
    return this.models["support-ticket"].create(arg1);
  }

  ticketFindOne(arg1) {
    return this.models["support-ticket"].findOne(arg1);
  }

  updateTicketSave(document) {
    return document.save();
  }

  classesFind(arg1) {
    return this.models["class"].find(arg1).select('_id');
  }

  listConductFind(arg1, arg2) {
    return this.models["conduct-record"].find(arg1).populate('studentId', 'name code').populate('classId', 'name').populate('recordedBy', 'name').populate('academicYearId', 'name').sort(arg2);
  }

  upsertConductFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["conduct-record"].findOneAndUpdate(arg1, arg2, arg3);
  }

  listTemplatesFind(arg1, arg2) {
    return this.models["shared-template"].find(arg1).populate('createdBy', 'name').sort(arg2);
  }

  listTemplatesFind2(arg1, arg2) {
    return this.models["shared-template"].find(arg1).populate('createdBy', 'name').sort(arg2);
  }

  createTemplateCreate(arg1) {
    return this.models["shared-template"].create(arg1);
  }

  tplFindById(arg1) {
    return this.models["shared-template"].findById(arg1);
  }

  updateTemplateSave(document) {
    return document.save();
  }

  updateTemplateUpdateMany(arg1, arg2) {
    return this.models["template-deployment"].updateMany(arg1, arg2);
  }

  templateFindById(arg1) {
    return this.models["shared-template"].findById(arg1);
  }

  schoolFindById(arg1) {
    return this.models["school"].findById(arg1);
  }

  applyTemplateToSchoolSave(document) {
    return document.save();
  }

  applyTemplateToSchoolFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["template-deployment"].findOneAndUpdate(arg1, arg2, arg3);
  }

  applyTemplateToSchoolPopulate(document) {
    return document.populate('appliedTemplateIds');
  }

  listTemplateDeploymentsFind(arg1, arg2) {
    return this.models["template-deployment"].find(arg1).populate('schoolId', 'name code').populate('templateId', 'name type version').sort(arg2).limit(500);
  }
}

module.exports = AdminExtraRepository;
