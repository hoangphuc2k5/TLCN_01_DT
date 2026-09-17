const ApiError = require('../utils/ApiError');
const Material = require('../models/LearningMaterial');
const MaterialDownload = require('../models/MaterialDownload');
const { ROLES } = require('../constants/roles');
const { objectId } = require('./dataScope');
const { materialScope } = require('./resourceService');

const managerRoles = new Set([ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS]);
const safeText = (value, max) => String(value || '').trim().slice(0, max);

const materialForAsset = async (actor, asset) => Material.findOne({
  ...(await materialScope(actor)),
  fileAssetId: asset._id,
}).select('_id schoolId uploadedBy title');

const start = async (actor, asset, context = {}) => {
  const material = await materialForAsset(actor, asset);
  if (!material) throw new ApiError(404, 'Không tìm thấy học liệu trong phạm vi');
  return MaterialDownload.create({
    schoolId: material.schoolId,
    materialId: material._id,
    fileAssetId: asset._id,
    userId: actor._id,
    sizeBytes: asset.sizeBytes,
    ip: safeText(context.ip, 200),
    userAgent: safeText(context.userAgent, 500),
  });
};

const complete = id => MaterialDownload.updateOne(
  { _id: id, status: 'STARTED' },
  { $set: { status: 'COMPLETED', completedAt: new Date() } }
);

const fail = id => MaterialDownload.updateOne(
  { _id: id, status: 'STARTED' },
  { $set: { status: 'FAILED' } }
);

const list = async (actor, materialId) => {
  const material = await Material.findOne({
    ...(await materialScope(actor)),
    _id: objectId(materialId, 'materialId'),
  }).select('_id schoolId uploadedBy title fileAssetId');
  if (!material) throw new ApiError(404, 'Không tìm thấy học liệu trong phạm vi');
  if (!managerRoles.has(actor.role) && String(material.uploadedBy) !== String(actor._id)) {
    throw new ApiError(403, 'Chỉ người đăng hoặc quản trị được xem lượt tải');
  }

  const filter = { materialId: material._id, status: 'COMPLETED' };
  const [downloads, totalDownloads, downloaderIds] = await Promise.all([
    MaterialDownload.find(filter).populate('userId', 'name code role email').sort({ createdAt: -1 }).limit(500),
    MaterialDownload.countDocuments(filter),
    MaterialDownload.distinct('userId', filter),
  ]);
  return {
    material: { _id: material._id, title: material.title },
    totalDownloads,
    uniqueDownloaders: downloaderIds.length,
    downloads,
  };
};

module.exports = { start, complete, fail, list };
