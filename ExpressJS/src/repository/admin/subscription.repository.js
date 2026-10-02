/** Database operations for subscription; dependencies are wired in config/container.js. */
class SubscriptionRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  subscriptionFindOne(arg1) {
    return this.models["subscription"].findOne(arg1);
  }

  countCountDocuments(arg1) {
    return this.models["user"].countDocuments(arg1);
  }

  listSubscriptionsFind(arg1, arg2) {
    return this.models["subscription"].find(arg1).populate('schoolId', 'name code').sort(arg2);
  }

  upsertSubscriptionFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["subscription"].findOneAndUpdate(arg1, arg2, arg3).populate('schoolId', 'name code');
  }

  subFindById(arg1) {
    return this.models["subscription"].findById(arg1);
  }

  createInvoiceCreate(arg1) {
    return this.models["subscription-invoice"].create(arg1);
  }

  invFindByIdAndUpdate(arg1, arg2, arg3) {
    return this.models["subscription-invoice"].findByIdAndUpdate(arg1, arg2, arg3);
  }

  markInvoicePaidFindByIdAndUpdate(arg1, arg2) {
    return this.models["subscription"].findByIdAndUpdate(arg1, arg2);
  }

  listInvoicesFind(arg1, arg2) {
    return this.models["subscription-invoice"].find(arg1).populate('schoolId', 'name code').sort(arg2).limit(100);
  }
}

module.exports = SubscriptionRepository;
