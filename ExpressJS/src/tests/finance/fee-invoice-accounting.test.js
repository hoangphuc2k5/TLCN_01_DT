const test = require('node:test');
const assert = require('node:assert/strict');

const FeeInvoiceAccountingService = require('../../services/finance/fee-invoice-accounting.service');

const accounting = new FeeInvoiceAccountingService({});

test('normalizes the unit price before calculating a line total', () => {
  const [line] = accounting.normalizeLineItems([{
    name: 'Tuition',
    quantity: 3,
    unitAmount: 1.006,
  }]);

  assert.equal(line.unitAmount, 1.01);
  assert.equal(line.amount, 3.03);
});

test('recalculates invoice totals before a save', () => {
  const invoice = {
    lineItems: [{ quantity: 3, unitAmount: 1.01, amount: 0, paidAmount: 2 }],
    amount: 0,
  };

  accounting.recalculateLineItems(invoice);

  assert.equal(invoice.lineItems[0].amount, 3.03);
  assert.equal(invoice.amount, 3.03);
});

test('rejects an overpaid line before a save', () => {
  const invoice = {
    lineItems: [{ quantity: 1, unitAmount: 10, amount: 10, paidAmount: 10.01 }],
    amount: 10,
  };

  assert.throws(
    () => accounting.recalculateLineItems(invoice),
    /Số tiền đã thu của khoản mục vượt thành tiền/
  );
});
