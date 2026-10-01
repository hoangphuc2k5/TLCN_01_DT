const { request: requestDto, response: responseDto } = require('../../dtos/admin/template.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const adminExtraService = require("../../config/container").services["admin-extra"];

const listTemplates = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.listTemplates(req.user, requestDto.query(req))));
});

const createTemplate = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.createTemplate(req.user, requestDto.body(req))), 'Tạo mẫu thành công', 201);
});

const updateTemplate = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.updateTemplate(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật mẫu thành công');
});

const applyTemplate = asyncHandler(async (req, res) => {
  return success(
    res, responseDto.fromService(await adminExtraService.applyTemplateToSchool(req.user, requestDto.params(req).schoolId, requestDto.body(req).templateId)),
    'Áp dụng mẫu thành công'
  );
});

const listTemplateDeployments = asyncHandler(async (req, res) => success(res, responseDto.fromService(await adminExtraService.listTemplateDeployments(req.user, requestDto.query(req)))));

module.exports = { listTemplates, createTemplate, updateTemplate, applyTemplate, listTemplateDeployments };
