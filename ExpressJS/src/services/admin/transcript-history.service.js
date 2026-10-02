function createTranscriptHistoryService(dependencies) {
  const persistence = dependencies.persistence;
  const { createHash } = require('node:crypto');
  const ApiError = require("../../utils/common/api-error.util");
  const certificates = dependencies.services["certificate"];
  const { objectId } = dependencies.services["data-scope"];
  
  const snapshotContent = transcript => {
    const content = JSON.parse(JSON.stringify(transcript));
    delete content.generatedAt;
    return content;
  };
  const assertFormat = format => {
    if (!['pdf', 'doc', 'docx'].includes(String(format).toLowerCase())) throw new ApiError(400, 'Định dạng chỉ hỗ trợ PDF hoặc DOCX');
  };
  
  const capture = async (actor, studentId) => {
    const transcript = await certificates.getTranscript(actor, studentId);
    const content = snapshotContent(transcript);
    const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
    const existing = await persistence.existingFindOne({ studentId: transcript.student._id, contentHash });
    if (existing) return existing;
  
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const latest = await persistence.latestFindOne({ studentId: transcript.student._id }, { version: -1 });
      const createdAt = new Date();
      try {
        return await persistence.captureCreate({
          schoolId: transcript.student.schoolId,
          studentId: transcript.student._id,
          version: (latest?.version || 0) + 1,
          contentHash,
          transcript: { ...content, generatedAt: createdAt.toISOString() },
          createdBy: actor._id,
          createdAt,
          updatedAt: createdAt,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        const duplicate = await persistence.duplicateFindOne({ studentId: transcript.student._id, contentHash });
        if (duplicate) return duplicate;
      }
    }
    throw new ApiError(409, 'Không thể cấp phiên bản học bạ, vui lòng thử lại');
  };
  
  const list = async (actor, studentId) => {
    const student = await certificates.assertStudentAccess(actor, studentId);
    return persistence.listFind({ schoolId: student.schoolId, studentId: student._id }, { version: -1 });
  };
  
  const findSnapshot = async (actor, studentId, snapshotId) => {
    const student = await certificates.assertStudentAccess(actor, studentId);
    const snapshot = await persistence.snapshotFindOne({
      _id: objectId(snapshotId, 'snapshotId'), schoolId: student.schoolId, studentId: student._id,
    });
    if (!snapshot) throw new ApiError(404, 'Không tìm thấy phiên bản học bạ trong phạm vi');
    return snapshot;
  };
  
  const currentCertificate = async (actor, studentId, format) => {
    assertFormat(format);
    const snapshot = await capture(actor, studentId);
    return { ...(await certificates.renderCertificate(snapshot.transcript, format)), snapshot };
  };
  
  const historicalCertificate = async (actor, studentId, snapshotId, format) => {
    assertFormat(format);
    const snapshot = await findSnapshot(actor, studentId, snapshotId);
    return { ...(await certificates.renderCertificate(snapshot.transcript, format)), snapshot };
  };
  
  return { capture, list, currentCertificate, historicalCertificate };
  
}

class TranscriptHistoryService {
  constructor(dependencies) {
    Object.assign(this, createTranscriptHistoryService(dependencies));
  }
}

module.exports = TranscriptHistoryService;
