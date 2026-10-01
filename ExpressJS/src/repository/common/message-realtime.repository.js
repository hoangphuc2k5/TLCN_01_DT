/** Database operations for message-realtime; dependencies are wired in config/container.js. */
class MessageRealtimeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  userFindById(arg1) {
    return this.models["user"].findById(arg1).select('+security');
  }

  userFindById2(arg1) {
    return this.models["user"].findById(arg1).select('+security');
  }

  latestMessageIdFindOne(arg1, arg2) {
    return this.models["message"].findOne(arg1).select('_id').sort(arg2).lean();
  }

  replayAfterFind(arg1, arg2, arg3) {
    return this.models["message"].find(arg1).select('_id senderId receiverId createdAt').sort(arg2).limit(arg3).lean();
  }
}

module.exports = MessageRealtimeRepository;
