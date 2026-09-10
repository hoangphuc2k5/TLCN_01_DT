const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/response'); const comparison = require('../services/schoolComparisonService');
exports.compareSchools = asyncHandler(async (req, res) => success(res, await comparison.compare(req.user, req.query)));
