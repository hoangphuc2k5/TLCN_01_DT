/** Database operations for fee; dependencies are wired in config/container.js. */
class FeeRepository {
  constructor({ models, shared, database, eventBus }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
    this.eventBus = eventBus;
  }

  rowsFind(arg1, arg2) {
    return this.shared.feeRepo.find(arg1, arg2);
  }

  invoiceCreate(arg1) {
    return this.shared.feeRepo.create(arg1);
  }

  rowsFind2(arg1, arg2) {
    return this.shared.feeRepo.find(arg1, arg2);
  }

  invoicesFind(arg1) {
    return this.models["fee-invoice"].find(arg1).limit(500);
  }

  claimedUpdateOne(arg1, arg2) {
    return this.models["fee-invoice"].updateOne(arg1, arg2);
  }

  recipientsFind(arg1) {
    return this.models["user"].find(arg1).select('_id role');
  }

  async runDebtRemindersInsertMany(arg1) {
    const documents = await this.models["notification"].insertMany(arg1);
    for (const document of documents) {
      this.eventBus.emit('notification.created', document.toObject ? document.toObject() : document);
    }
    return documents;
  }

  invoiceFindById(arg1) {
    return this.shared.feeRepo.findById(arg1);
  }

  currentFindById(arg1, arg2) {
    return this.models["fee-invoice"].findById(arg1).session(arg2);
  }

  recordPaymentSave(document, arg2) {
    return document.save(arg2);
  }

  recordPaymentCreate(arg1, arg2) {
    return this.models["payment"].create(arg1, arg2);
  }

  listPaymentsFind(arg1, arg2) {
    return this.shared.paymentRepo.find(arg1, arg2);
  }

  recordPaymentTransaction(arg1) {
    return this.database.connection.transaction(arg1);
  }
}

module.exports = FeeRepository;
