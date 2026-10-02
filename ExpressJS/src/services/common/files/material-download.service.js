function createMaterialDownloadService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../../utils/common/http/api-error.util");
  const { ROLES } = require("../../../config/constants/roles.config");
  const { objectId } = dependencies.services["data-scope"];
  const { materialScope } = dependencies.services["resource"];
  
  const managerRoles = new Set([ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS]);
  const safeText = (value, max) => String(value || '').trim().slice(0, max);
  
  const materialForAsset = async (actor, asset) => persistence.materialForAssetFindOne({
    ...(await materialScope(actor)),
    fileAssetId: asset._id,
  });
  
  const start = async (actor, asset, context = {}) => {
    const material = await materialForAsset(actor, asset);
    if (!material) throw new ApiError(404, 'Không tìm thấy học liệu trong phạm vi');
    return persistence.startCreate({
      schoolId: material.schoolId,
      materialId: material._id,
      fileAssetId: asset._id,
      userId: actor._id,
      sizeBytes: asset.sizeBytes,
      ip: safeText(context.ip, 200),
      userAgent: safeText(context.userAgent, 500),
    });
  };
  
  const complete = id => persistence.completeUpdateOne({ _id: id, status: 'STARTED' }, { $set: { status: 'COMPLETED', completedAt: new Date() } });
  
  const fail = id => persistence.failUpdateOne({ _id: id, status: 'STARTED' }, { $set: { status: 'FAILED' } });
  
  const list = async (actor, materialId) => {
    const material = await persistence.materialFindOne({
      ...(await materialScope(actor)),
      _id: objectId(materialId, 'materialId'),
    });
    if (!material) throw new ApiError(404, 'Không tìm thấy học liệu trong phạm vi');
    if (!managerRoles.has(actor.role) && String(material.uploadedBy) !== String(actor._id)) {
      throw new ApiError(403, 'Chỉ người đăng hoặc quản trị được xem lượt tải');
    }
  
    const filter = { materialId: material._id, status: 'COMPLETED' };
    const [downloads, totalDownloads, downloaderIds] = await Promise.all([
      persistence.listFind(filter, { createdAt: -1 }),
      persistence.listCountDocuments(filter),
      persistence.listDistinct(filter),
    ]);
    return {
      material: { _id: material._id, title: material.title },
      totalDownloads,
      uniqueDownloaders: downloaderIds.length,
      downloads,
    };
  };
  
  return { start, complete, fail, list };
  
}

class MaterialDownloadService {
  constructor(dependencies) {
    Object.assign(this, createMaterialDownloadService(dependencies));
  }
}

module.exports = MaterialDownloadService;
