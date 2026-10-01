function createScheduleTransactionService(dependencies) {
  const persistence = dependencies.persistence;
  const mongoose = require('mongoose');
  const ApiError = require("../../utils/common/api-error.util");
  
  // All timetable writes and teacher leave approvals serialize on the same school.
  // The write happens before reads, so a transaction retry sees the winner's schedule.
  const execute = async (schoolId, work) => {
    try {
      return await persistence.transaction(async session => {
        const result = await persistence.resultUpdateOne({ _id: schoolId }, { $inc: { scheduleRevision: 1 } }, { session });
        if (!result.matchedCount) throw new ApiError(404, 'Không tìm thấy trường');
        return work(session);
      });
    } catch (error) {
      if (error.code === 20 || error.codeName === 'IllegalOperation') {
        throw new ApiError(503, 'Cập nhật lịch cần MongoDB replica set để bảo đảm không trùng lịch');
      }
      throw error;
    }
  };
  return { execute };
  
}

class ScheduleTransactionService {
  constructor(dependencies) {
    Object.assign(this, createScheduleTransactionService(dependencies));
  }
}

module.exports = ScheduleTransactionService;
