# Module CRUD nghiệp vụ

## Phạm vi và người phụ trách

Nhi phụ trách module dữ liệu nghiệp vụ của Smart Expense Tracker. Module này đáp ứng US-02, US-03, US-04 và US-11; đồng thời quản lý bản ghi hóa đơn phục vụ US-05 và US-06. Các chức năng thêm, sửa, xóa dữ liệu vẫn chạy được khi AI/OCR gặp lỗi hoặc không hoạt động.

## Luồng sử dụng

1. Sau khi đăng nhập, middleware xác thực sẽ gắn ID tài khoản hiện tại vào `req.user.id`.
2. Client lấy danh sách danh mục. Với người dùng mới, hệ thống tự tạo các danh mục tiếng Việt: Ăn uống, Mua sắm, Di chuyển, Nhà cửa, Giáo dục, Sức khỏe, Giải trí, Lương, Thưởng và Thu nhập khác.
3. Người dùng thêm, tìm kiếm, lọc, sắp xếp, phân trang, sửa hoặc xóa giao dịch. Mỗi giao dịch phải có số tiền lớn hơn 0 và danh mục đúng loại thu nhập/chi tiêu.
4. Sau thao tác thêm, sửa hoặc xóa giao dịch, client tải lại dữ liệu. Dashboard cập nhật tổng thu, tổng chi và số dư từ dữ liệu đã lưu.
5. Người dùng thiết lập ngân sách theo tháng và danh mục. Tiền đã chi được tính từ giao dịch chi tiêu thực tế. Xóa ngân sách không làm ảnh hưởng giao dịch.
6. Khi tạo hóa đơn, hệ thống lưu bản ghi ở trạng thái `review`. Module AI/OCR sau này sẽ điền các trường trích xuất. Chỉ module Transactions tạo giao dịch sau bước người dùng xác nhận.

## API đã triển khai

| Nghiệp vụ | API | Ghi chú |
| --- | --- | --- |
| Giao dịch | `GET/POST /api/transactions`, `GET/PUT/DELETE /api/transactions/:id` | `GET` hỗ trợ `search`, `type`, `categoryId`, `from`, `to`, `sort`, `page`, `limit`. |
| Danh mục | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` | Không cho sửa/xóa danh mục mặc định. Không cho xóa danh mục đang được giao dịch sử dụng. |
| Ngân sách | `GET/POST /api/budgets`, `PUT/DELETE /api/budgets/:id` | Kết quả `GET` chứa thêm trường `spent` được tính tự động. |
| Hóa đơn | `POST /api/receipts/upload`, `GET/POST /api/receipts`, `GET/PUT/DELETE /api/receipts/:id` | Upload nhận JPG, PNG, WebP tối đa 5 MB. AI/OCR sẽ cập nhật metadata sau khi upload. |

## Bảo mật và quyền dữ liệu

Mọi truy vấn trong store đều lọc theo ID người dùng hiện tại. API không nhận `userId` từ body của client, vì client không đáng tin cậy. Khi Google OAuth/JWT được tích hợp, `req.user.id` là nguồn xác thực chính.

Trong môi trường phát triển, client có thể dùng header `x-demo-user-id` để nhóm làm việc trước khi hoàn thành đăng nhập. Header này chỉ được chấp nhận khi `NODE_ENV` khác `production` hoặc `DEV_AUTH_BYPASS=true`. Ở production, request không có `req.user.id` nhận HTTP 401.

Hiện bản prototype lưu dữ liệu vào `data/expense-data.json` để chạy local không cần cài thêm database. Trước khi deploy, thay store này bằng repository của database đã chọn, nhưng phải giữ API và kiểm tra ownership hiện tại.

## File cần nắm khi vấn đáp

- `server/src/features/expenses/expenses.routes.js`: Nhận request, gọi validation, kiểm tra quyền và áp dụng luật nghiệp vụ.
- `server/src/features/expenses/expenses.schemas.js`: Quy định dữ liệu đầu vào hợp lệ bằng Zod.
- `server/src/features/expenses/expenses.store.js`: Lưu dữ liệu và tạo danh mục mặc định cho người dùng mới.
- `client/src/App.jsx`: Giao diện dashboard và các form CRUD.
