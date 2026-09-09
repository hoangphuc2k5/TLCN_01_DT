const mongoose = require('mongoose');
const School = require('../models/School');
const ApiError = require('../utils/ApiError');

// All timetable writes and teacher leave approvals serialize on the same school.
// The write happens before reads, so a transaction retry sees the winner's schedule.
module.exports = async (schoolId, work) => {
  try {
    return await mongoose.connection.transaction(async session => {
      const result = await School.updateOne({ _id: schoolId }, { $inc: { scheduleRevision: 1 } }, { session });
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
