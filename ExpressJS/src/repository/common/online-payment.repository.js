/** Database operations for online-payment; dependencies are wired in config/container.js. */
class OnlinePaymentRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  invoiceFindOne(arg1) {
    return this.models["fee-invoice"].findOne(arg1);
  }

  previousFindOne(arg1) {
    return this.models["online-payment"].findOne(arg1);
  }

  activeFindOne(arg1) {
    return this.models["online-payment"].findOne(arg1);
  }

  createOnlinePaymentCreate(arg1) {
    return this.models["online-payment"].create(arg1);
  }

  createOnlinePaymentFindOne(arg1) {
    return this.models["online-payment"].findOne(arg1);
  }

  listOnlinePaymentsFind(arg1, arg2) {
    return this.models["online-payment"].find(arg1).populate('invoiceId', 'title amount paidAmount dueDate status').populate('studentId', 'name code').sort(arg2).limit(200);
  }

  rowFindOne(arg1) {
    return this.models["online-payment"].findOne(arg1).populate('invoiceId', 'title amount paidAmount dueDate status').populate('studentId', 'name code');
  }

  rowFindOne2(arg1) {
    return this.models["online-payment"].findOne(arg1);
  }

  webhookFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["online-payment"].findOneAndUpdate(arg1, arg2, arg3);
  }

  newObjectId() {
    return new this.database.Types.ObjectId();
  }

  async runTransaction(operation) {
    const session = await this.database.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  paidFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["online-payment"].findOneAndUpdate(arg1, arg2, arg3);
  }

  webhookFindById(arg1, arg2) {
    return this.models["online-payment"].findById(arg1).session(arg2);
  }

  invoiceFindOne2(arg1, arg2) {
    return this.models["fee-invoice"].findOne(arg1).session(arg2);
  }

  webhookSave(document, arg2) {
    return document.save(arg2);
  }

  webhookCreate(arg1, arg2) {
    return this.models["payment"].create(arg1, arg2);
  }

  webhookFindById2(arg1) {
    return this.models["online-payment"].findById(arg1);
  }

  rowFindOne3(arg1) {
    return this.models["online-payment"].findOne(arg1);
  }
}

module.exports = OnlinePaymentRepository;
