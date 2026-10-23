import * as expenseService from './expenses.service.js';
import { HTTP_STATUS } from '../../constants/index.js';

// Chuyển lỗi nghiệp vụ về error handler dùng chung của Express.
async function respond(action, req, res, next) {
  try {
    await action();
  } catch (error) {
    next(error);
  }
}

export const list = (req, res, next) => respond(
  async () => res.json(await expenseService.listTransactions(req.user, res.locals.validated.query)), req, res, next
);

export const get = (req, res, next) => respond(
  async () => res.json({ transaction: await expenseService.getTransaction(req.user, req.params.id) }), req, res, next
);

export const create = (req, res, next) => respond(
  async () => res.status(HTTP_STATUS.CREATED).json({ transaction: await expenseService.createTransaction(req.user, res.locals.validated.body) }), req, res, next
);

export const update = (req, res, next) => respond(
  async () => res.json({ transaction: await expenseService.updateTransaction(req.user, req.params.id, res.locals.validated.body) }), req, res, next
);

export const remove = (req, res, next) => respond(
  async () => res.json({ transaction: await expenseService.deleteTransaction(req.user, req.params.id) }), req, res, next
);

export const upload = (req, res, next) => respond(
  async () => res.status(HTTP_STATUS.CREATED).json({ receipt: expenseService.createReceiptDraft(req.user, res.locals.validated.body) }), req, res, next
);
