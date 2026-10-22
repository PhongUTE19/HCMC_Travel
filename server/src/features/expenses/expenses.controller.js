import * as expenseService from './expenses.service.js';
import { HTTP_STATUS } from '../../constants/index.js';

// Chuyển lỗi nghiệp vụ về error handler dùng chung của Express.
function respond(action, req, res, next) {
  try {
    action();
  } catch (error) {
    next(error);
  }
}

export const list = (req, res, next) => respond(
  () => res.json(expenseService.listTransactions(res.locals.validated.query)), req, res, next
);

export const get = (req, res, next) => respond(
  () => res.json({ transaction: expenseService.getTransaction(req.params.id) }), req, res, next
);

export const create = (req, res, next) => respond(
  () => res.status(HTTP_STATUS.CREATED).json({ transaction: expenseService.createTransaction(res.locals.validated.body) }), req, res, next
);

export const update = (req, res, next) => respond(
  () => res.json({ transaction: expenseService.updateTransaction(req.params.id, res.locals.validated.body) }), req, res, next
);

export const remove = (req, res, next) => respond(
  () => res.json({ transaction: expenseService.deleteTransaction(req.params.id) }), req, res, next
);

export const upload = (req, res, next) => respond(
  () => res.status(HTTP_STATUS.CREATED).json({ receipt: expenseService.createReceiptDraft(res.locals.validated.body) }), req, res, next
);
