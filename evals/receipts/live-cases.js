// Synthetic evaluation corpus only.  These are deliberately generated text
// layouts, not photographs or scans of real receipts.
export const liveReceiptCases = [
  { id: '01-cafe-usd', group: 'normal', kind: 'receipt', merchant: 'ORCHID CAFE', date: '2026-10-20', total: 12.5, currency: 'USD', lines: ['Coffee                 4.50', 'Sandwich               8.00'] },
  { id: '02-vinmart-vnd', group: 'normal', kind: 'receipt', merchant: 'VINMART TEST', date: '2026-10-21', total: 183000, currency: 'VND', lines: ['Chuoi tieu            20.000', 'Sua tuoi              32.000', 'Thit heo             131.000'] },
  { id: '03-grocery-usd', group: 'normal', kind: 'receipt', merchant: 'GREEN MARKET', date: '2026-10-22', total: 27.25, currency: 'USD', lines: ['Apples                 5.25', 'Bread                  4.00', 'Vegetables            18.00'] },
  { id: '04-city-taxi', group: 'normal', kind: 'receipt', merchant: 'CITY TAXI', date: '2026-10-23', total: 18.7, currency: 'USD', lines: ['Ride fare             18.70'] },
  { id: '05-book-vnd', group: 'normal', kind: 'receipt', merchant: 'SAIGON BOOKS', date: '2026-10-24', total: 95000, currency: 'VND', lines: ['Khoa hoc du lieu      95.000'] },
  { id: '06-pharmacy-usd', group: 'normal', kind: 'receipt', merchant: 'HEALTH PHARMACY', date: '2026-10-25', total: 13.5, currency: 'USD', lines: ['Vitamin C             13.50'] },
  { id: '07-cinema-usd', group: 'normal', kind: 'receipt', merchant: 'STAR CINEMA', date: '2026-10-26', total: 22, currency: 'USD', lines: ['Two tickets           22.00'] },
  { id: '08-stationery-vnd', group: 'normal', kind: 'receipt', merchant: 'PAPER HOUSE', date: '2026-10-27', total: 46000, currency: 'VND', lines: ['Notebook              28.000', 'Pen                   18.000'] },
  { id: '09-small-decimal', group: 'edge', kind: 'receipt', merchant: 'MINI MART', date: '2026-10-28', total: 0.99, currency: 'USD', lines: ['Candy                  0.99'] },
  { id: '10-no-date', group: 'edge', kind: 'receipt', merchant: 'NO DATE BAKERY', date: null, total: 7.5, currency: 'USD', lines: ['Bread                  7.50'] },
  { id: '11-no-items', group: 'edge', kind: 'receipt', merchant: 'PARKING GARAGE', date: '2026-10-29', total: 4, currency: 'USD', lines: [] },
  { id: '12-invoice', group: 'edge', kind: 'invoice', merchant: 'ACME SERVICES', date: '2026-10-30', total: 1250000, currency: 'VND', lines: ['Consulting          1.250.000'] },
  { id: '13-poster', group: 'refusal', kind: 'poster', expectedDecision: 'reject' },
  { id: '14-injection-only', group: 'refusal', kind: 'injection', expectedDecision: 'reject' },
  { id: '15-empty-page', group: 'refusal', kind: 'blank', expectedDecision: 'reject' },
  { id: '16-menu', group: 'refusal', kind: 'menu', expectedDecision: 'reject' },
  { id: '17-social-post', group: 'refusal', kind: 'social', expectedDecision: 'reject' },
  { id: '18-code-snippet', group: 'refusal', kind: 'code', expectedDecision: 'reject' },
  { id: '19-id-card', group: 'refusal', kind: 'idcard', expectedDecision: 'reject' },
  { id: '20-unreadable', group: 'refusal', kind: 'unreadable', expectedDecision: 'reject' },
].map((entry) => ({ ...entry, expectedDecision: entry.expectedDecision || 'accept' }));

const extractionExpectations = {
  '01-cafe-usd': { category: 'Food & dining', itemCount: 2 },
  '02-vinmart-vnd': { category: 'Food & dining', itemCount: 3 },
  '03-grocery-usd': { category: 'Food & dining', itemCount: 3 },
  '04-city-taxi': { category: 'Transportation', itemCount: 1 },
  '05-book-vnd': { category: 'Education', itemCount: 1 },
  '06-pharmacy-usd': { category: 'Health', itemCount: 1 },
  '07-cinema-usd': { category: 'Entertainment', itemCount: 1 },
  '08-stationery-vnd': { category: 'Education', itemCount: 2 },
  '09-small-decimal': { category: 'Food & dining', itemCount: 1 },
  '10-no-date': { category: 'Food & dining', itemCount: 1, nullFields: ['transactionDate'] },
  '11-no-items': { category: 'Transportation', itemCount: 0 },
  '12-invoice': { category: 'Other expenses', itemCount: 1, documentType: 'invoice' },
};

for (const testCase of liveReceiptCases) {
  if (testCase.expectedDecision === 'reject') {
    testCase.expectedFailureCodes = ['NOT_A_RECEIPT', 'PROMPT_INJECTION_REJECTED'];
    continue;
  }
  const expectation = extractionExpectations[testCase.id];
  testCase.expectedExtraction = {
    documentType: expectation.documentType || 'receipt',
    transactionType: 'expense',
    merchant: testCase.merchant,
    transactionDate: testCase.date,
    totalAmount: testCase.total,
    currency: testCase.currency,
    category: expectation.category,
    itemCount: expectation.itemCount,
    nullFields: expectation.nullFields || [],
  };
}
