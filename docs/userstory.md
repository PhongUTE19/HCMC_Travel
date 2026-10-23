SMART EXPENSE TRACKER
USER STORIES & ACCEPTANCE CRITERIA  |  MILESTONE 1
Bản đặc tả đề xuất v1.1 • Nhóm 3 thành viên • 14 User Stories • Web App
QUYẾT ĐỊNH ĐÃ CHỐT
NỘI DUNG
Phạm vi dữ liệu
Nhập thu chi thủ công và tải ảnh hóa đơn; KHÔNG kết nối ngân hàng, không chuyển tiền, không thanh toán.
AI capabilities
B – Tool-Using Agent; C – Structured Output; D – Multimodal Input. Không cam kết RAG ở M1.
Công nghệ dự kiến
React (Web), Express API, PostgreSQL, Gemini qua backend; SSE streaming; Google OAuth2 + JWT; Docker Compose.
Nguyên tắc đặc tả
User Story nêu giá trị cho người dùng; yêu cầu kỹ thuật, tài liệu và kiểm thử theo dõi ở Engineering Backlog.

 
1. Bối cảnh và phạm vi sản phẩm
Người dùng mục tiêu: cá nhân, đặc biệt là sinh viên và người mới đi làm, cần ghi chép và hiểu thói quen chi tiêu mà không phải nhập lại từng hóa đơn.
Vấn đề: nhập liệu mất thời gian, phân loại thiếu nhất quán, khó tìm giao dịch và khó tự tổng hợp các khoản thu chi.
Giải pháp: lưu giao dịch thủ công hoặc qua ảnh hóa đơn; AI trích xuất và gợi ý danh mục; trợ lý sử dụng tools để hỏi đáp và đề xuất thay đổi có xác nhận; dashboard tính toán từ database.
2. Cấu trúc User Story và quy tắc nghiệm thu
THÀNH PHẦN
QUY TẮC
User Story
As a [role], I want [goal], so that [benefit].
Acceptance Criteria
Given [bối cảnh], when [hành động], then [kết quả quan sát/kiểm thử được].
Priority
Must Have: bắt buộc trong phạm vi đã chốt; Should Have: ưu tiên sau nếu đủ thời gian.
Không nhầm lẫn
Docker, prompt versioning, ADR, evaluation, AI_USAGE.md là technical/deliverable tasks, không ép thành US.

 
3. Danh mục 14 User Stories
ID
TÊN USER STORY
ƯU TIÊN
NHÓM YÊU CẦU
US-01
Đăng nhập và phân quyền
MUST
Authentication / OAuth2 + JWT + RBAC
US-02
Quản lý giao dịch thu chi
MUST
CRUD / Persistent data / Isolation
US-03
Tìm kiếm và tổ chức giao dịch
MUST
Search / Filter / Sort / Pagination
US-04
Quản lý danh mục thu chi
MUST
Category CRUD / Isolation
US-05
Tải lên và quản lý ảnh hóa đơn
MUST
File upload / Access control
US-06
Tạo giao dịch từ ảnh hóa đơn bằng AI
MUST
AI C – Structured Output / AI D – Multimodal
US-07
AI đề xuất danh mục giao dịch
MUST
AI C – Structured Output
US-08
Dashboard và phân tích thu chi
MUST
Analytics / SQL calculations
US-09
Hỏi đáp chi tiêu bằng ngôn ngữ tự nhiên
MUST
AI B – Tool-Using Agent
US-10
Thay đổi giao dịch qua AI có xác nhận
MUST
AI B – Agent tools / Confirmation
US-11
Thiết lập và theo dõi ngân sách
SHOULD
Budget management (non-AI)
US-12
Trải nghiệm trợ lý AI và xử lý lỗi
MUST
SSE / Guardrails / Fallback
US-13
Quyền riêng tư và dữ liệu cá nhân
MUST
Privacy / Security / Data isolation
US-14
Admin theo dõi hoạt động AI
MUST
AI Logging / Admin dashboard

 
4. Đặc tả chi tiết và Acceptance Criteria
US-01  |  Đăng nhập và phân quyền
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to sign in with Google, so that I can securely access my personal expense records.
Priority
Must Have
Requirement mapping
Authentication / OAuth2 + JWT + RBAC

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given chưa đăng nhập, when truy cập trang dữ liệu cá nhân, then hệ thống yêu cầu đăng nhập.
AC-02
Given xác thực Google OAuth2 thành công, when quay lại ứng dụng, then người dùng được thiết lập phiên JWT và truy cập dữ liệu của mình.
AC-03
Given JWT hết hạn hoặc không hợp lệ, when gọi protected API, then hệ thống từ chối với mã 401.
AC-04
Given role user, when truy cập API dành riêng cho admin, then hệ thống từ chối với mã 403.
AC-05
Given người dùng đăng xuất, when tiếp tục sử dụng phiên đã kết thúc, then hệ thống không cho truy cập tài nguyên được bảo vệ.

 
US-02  |  Quản lý giao dịch thu chi
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to create, view, update, and delete income and expense transactions, so that I can keep an accurate financial history.
Priority
Must Have
Requirement mapping
CRUD / Persistent data / Isolation

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given dữ liệu hợp lệ (loại, số tiền dương, ngày, danh mục), when lưu, then giao dịch được tạo và tồn tại trong database.
AC-02
Given giao dịch của mình, when xem chi tiết, then hệ thống hiển thị đúng thông tin đã lưu.
AC-03
Given giao dịch của mình, when sửa trường hợp lệ, then thay đổi được lưu và hiển thị lại.
AC-04
Given yêu cầu xóa, when người dùng xác nhận, then giao dịch không còn trong danh sách hiện hành.
AC-05
Given số tiền không hợp lệ hoặc thiếu trường bắt buộc, when gửi dữ liệu, then hệ thống không lưu và trả lỗi validation.
AC-06
Given ID giao dịch của người khác, when xem/sửa/xóa, then hệ thống từ chối.
AC-07
Given ứng dụng khởi động lại, when người dùng đăng nhập và xem lịch sử, then các giao dịch đã lưu vẫn còn.

 
US-03  |  Tìm kiếm và tổ chức giao dịch
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to search, filter, sort, and paginate my transactions, so that I can find records quickly.
Priority
Must Have
Requirement mapping
Search / Filter / Sort / Pagination

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given lịch sử giao dịch, when tìm theo mô tả hoặc cửa hàng, then danh sách chỉ trả kết quả phù hợp.
AC-02
Given bộ lọc khoảng ngày, loại và danh mục, when áp dụng, then chỉ các giao dịch thỏa điều kiện được trả về.
AC-03
Given sắp xếp theo ngày hoặc số tiền tăng/giảm, when áp dụng, then kết quả có thứ tự tương ứng.
AC-04
Given số kết quả lớn hơn page size, when chuyển trang, then hiển thị đúng bản ghi và tổng số kết quả.
AC-05
Given không có kết quả, then giao diện hiển thị trạng thái rỗng.

 
US-04  |  Quản lý danh mục thu chi
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to manage income and expense categories, so that I can organize my transactions meaningfully.
Priority
Must Have
Requirement mapping
Category CRUD / Isolation

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given tài khoản mới, when mở danh mục, then có các danh mục mặc định phù hợp.
AC-02
Given tên danh mục hợp lệ, when tạo, then danh mục được lưu và có thể chọn cho giao dịch.
AC-03
Given danh mục tùy chỉnh, when đổi tên, then tên mới được cập nhật mà không mất liên kết giao dịch.
AC-04
Given danh mục đang được sử dụng, when xóa, then hệ thống yêu cầu chuyển liên kết hoặc từ chối có giải thích.
AC-05
Given danh mục riêng của người khác, when truy cập, then hệ thống từ chối.

 
US-05  |  Tải lên và quản lý ảnh hóa đơn
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to upload and view receipt photos, so that I can keep purchase evidence and use it for AI-assisted entry.
Priority
Must Have
Requirement mapping
File upload / Access control

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given ảnh JPG, PNG hoặc WebP trong giới hạn dung lượng, when upload, then ảnh được lưu gắn với tài khoản.
AC-02
Given ảnh đã lưu, when mở danh sách, then người dùng xem được ảnh và trạng thái xử lý.
AC-03
Given file sai định dạng hoặc quá dung lượng, when upload, then hệ thống từ chối và hiển thị lý do.
AC-04
Given ảnh đã tải lên, when yêu cầu phân tích, then backend chuyển ảnh tới luồng xử lý AI.
AC-05
Given ảnh thuộc người dùng khác, when truy cập qua API hoặc URL, then hệ thống từ chối.
AC-06
Given người dùng xóa ảnh, then ảnh không còn truy cập được qua ứng dụng và được xử lý theo chính sách lưu trữ công bố.

 
US-06  |  Tạo giao dịch từ ảnh hóa đơn bằng AI
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want AI to read a receipt and prepare an expense transaction for my review, so that I can reduce manual entry.
Priority
Must Have
Requirement mapping
AI C – Structured Output / AI D – Multimodal

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given ảnh hóa đơn hợp lệ, when yêu cầu trích xuất, then AI xử lý ảnh và trả dữ liệu có cấu trúc.
AC-02
Given thông tin nhận diện được, then kết quả gồm tên cửa hàng, ngày, tổng tiền, tiền tệ và các dòng sản phẩm nếu có.
AC-03
Given JSON AI trả về, when backend validate theo schema, then kết quả sai schema không được lưu như giao dịch.
AC-04
Given trường không nhận diện được, then hệ thống để trống hoặc yêu cầu kiểm tra, không bịa giá trị.
AC-05
Given bản xem trước, when người dùng chỉnh sửa và xác nhận, then tạo giao dịch và liên kết với hóa đơn.
AC-06
Given người dùng hủy, then không tạo giao dịch.
AC-07
Given AI timeout, invalid JSON hoặc không đọc được ảnh, then hiển thị lỗi và cho phép nhập thủ công.
AC-08
Given hóa đơn có tổng tiền và nhiều dòng sản phẩm, then hệ thống không cộng trùng các dòng vào tổng giao dịch.

 
US-07  |  AI đề xuất danh mục giao dịch
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want AI to suggest a transaction category, so that I can classify spending with less effort.
Priority
Must Have
Requirement mapping
AI C – Structured Output

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given mô tả hoặc dữ liệu hóa đơn, when yêu cầu phân loại, then AI đề xuất danh mục thuộc tập danh mục được phép.
AC-02
Given AI trả JSON, when backend validate schema và category ID, then chỉ kết quả hợp lệ được hiển thị.
AC-03
Given danh mục đề xuất, when người dùng chấp nhận hoặc đổi danh mục, then giá trị đã chọn được lưu.
AC-04
Given dữ liệu mơ hồ, then hệ thống yêu cầu người dùng chọn danh mục thay vì khẳng định thiếu căn cứ.
AC-05
Given AI không khả dụng, then người dùng vẫn chọn danh mục thủ công.

 
US-08  |  Dashboard và phân tích thu chi
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to view spending summaries and charts, so that I can understand my finances over time.
Priority
Must Have
Requirement mapping
Analytics / SQL calculations

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given giao dịch đã lưu, when mở dashboard, then hiển thị tổng thu, tổng chi và chênh lệch thu–chi.
AC-02
Given khoảng thời gian được chọn, then thống kê chỉ tính các giao dịch trong khoảng đó.
AC-03
Given giao dịch có danh mục, then biểu đồ thể hiện phân bổ chi tiêu theo danh mục.
AC-04
Given giao dịch được thêm/sửa/xóa, then số liệu sau khi tải lại phản ánh dữ liệu mới.
AC-05
Given không có dữ liệu, then dashboard hiển thị trạng thái rỗng và không tạo số liệu giả.
AC-06
Given AI bị lỗi, then dashboard vẫn tính bằng backend/database.

 
US-09  |  Hỏi đáp chi tiêu bằng ngôn ngữ tự nhiên
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to ask questions about my expenses in natural language, so that I can understand my records without manual calculations.
Priority
Must Have
Requirement mapping
AI B – Tool-Using Agent

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given câu hỏi tổng chi, when agent xử lý, then LLM gọi tool thống kê trên dữ liệu thật.
AC-02
Given câu hỏi tìm giao dịch, then LLM có thể gọi tool tìm kiếm và xem chi tiết giao dịch.
AC-03
Given câu hỏi cần nhiều bước, then agent có thể phối hợp các tool trước khi trả lời.
AC-04
Given câu hỏi về tổng tiền hoặc so sánh, then phép tính do backend/database thực hiện, không dựa vào phép cộng tự do của LLM.
AC-05
Given không có dữ liệu phù hợp, then agent nêu rõ không có dữ liệu và không bịa số tiền.
AC-06
Given người dùng A, then mọi tool chỉ truy cập dữ liệu của A.
AC-07
Given câu trả lời có số liệu, then người dùng có thể xem giao dịch hoặc khoảng thời gian làm căn cứ.

 
US-10  |  Thay đổi giao dịch qua AI có xác nhận
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to create, update, or delete transactions through an AI assistant with confirmation, so that I retain control over my data.
Priority
Must Have
Requirement mapping
AI B – Agent tools / Confirmation

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given yêu cầu thay đổi bằng ngôn ngữ tự nhiên, then agent tạo đề xuất thao tác và hiển thị dữ liệu dự kiến.
AC-02
Given chưa có xác nhận rõ ràng từ người dùng, then backend không thực hiện thao tác ghi.
AC-03
Given người dùng xác nhận, when backend kiểm tra quyền và dữ liệu, then thao tác mới được thực hiện.
AC-04
Given người dùng từ chối, then không có thay đổi.
AC-05
Given yêu cầu sửa/xóa, then hệ thống xác định đúng bản ghi trước khi yêu cầu xác nhận.
AC-06
Given xác nhận đã được xử lý, when gửi lại cùng mã xác nhận, then không thực hiện thao tác trùng.
AC-07
Given backend thất bại, then AI/giao diện báo thất bại, không tuyên bố thành công.

 
US-11  |  Thiết lập và theo dõi ngân sách
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to set monthly category budgets, so that I can track spending against my limits.
Priority
Should Have
Requirement mapping
Budget management (non-AI)

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given tháng, danh mục và hạn mức dương, when lưu, then ngân sách được tạo.
AC-02
Given ngân sách đã có, when chỉnh sửa, then hạn mức được cập nhật.
AC-03
Given giao dịch thuộc tháng và danh mục, then hệ thống hiển thị đã chi và còn lại dựa trên dữ liệu thật.
AC-04
Given tổng chi đạt hoặc vượt hạn mức, then hệ thống hiển thị cảnh báo rõ ràng.
AC-05
Given ngân sách bị xóa, then các giao dịch không bị xóa theo.
AC-06
Given ngân sách của người khác, when truy cập, then hệ thống từ chối.

 
US-12  |  Trải nghiệm trợ lý AI và xử lý lỗi
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want to see AI response progress and clear error states, so that I know whether my request succeeded.
Priority
Must Have
Requirement mapping
SSE / Guardrails / Fallback

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given người dùng gửi câu hỏi, then giao diện hiển thị trạng thái đang xử lý.
AC-02
Given backend stream câu trả lời, then nội dung được hiển thị dần và hoàn tất đúng trạng thái.
AC-03
Given AI timeout, invalid JSON hoặc empty answer, then hiển thị lỗi rõ ràng, không giả lập thành công.
AC-04
Given yêu cầu ngoài phạm vi ứng dụng, then trợ lý từ chối hoặc hướng về chức năng thu chi.
AC-05
Given hóa đơn/prompt chứa chỉ dẫn cố thao túng agent, then nội dung đó được xem là dữ liệu và không vượt qua quy tắc hệ thống.
AC-06
Given AI service ngừng hoạt động, then các chức năng non-AI vẫn hoạt động.

 
US-13  |  Quyền riêng tư và dữ liệu cá nhân
THUỘC TÍNH
NỘI DUNG
Role
User
User Story
As a user, I want my financial data to stay private and to know what is sent to AI providers, so that I can make informed choices.
Priority
Must Have
Requirement mapping
Privacy / Security / Data isolation

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given tài khoản đăng nhập, then backend chỉ trả dữ liệu thuộc quyền của tài khoản đó.
AC-02
Given ID giao dịch, hóa đơn, danh mục hoặc ngân sách của người khác, when truy cập, then hệ thống từ chối.
AC-03
Given trang quyền riêng tư, then ứng dụng mô tả loại dữ liệu có thể gửi đến LLM provider và mục đích.
AC-04
Given AI request, then backend chỉ gửi dữ liệu cần thiết cho tác vụ, không tự động gửi toàn bộ lịch sử.
AC-05
Given request thiếu/sai dữ liệu, then backend kiểm tra và từ chối trước khi xử lý nghiệp vụ.
AC-06
Given người dùng không sử dụng AI, then các tính năng CRUD và thống kê thông thường vẫn dùng được.

 
US-14  |  Admin theo dõi hoạt động AI
THUỘC TÍNH
NỘI DUNG
Role
Admin
User Story
As an administrator, I want to monitor AI usage, cost, latency, and failures, so that I can assess reliability and operating cost.
Priority
Must Have
Requirement mapping
AI Logging / Admin dashboard

 
AC ID
ĐIỀU KIỆN NGHIỆM THU (GIVEN – WHEN – THEN)
AC-01
Given admin đăng nhập, when mở dashboard, then hiển thị số lượng AI requests theo khoảng thời gian.
AC-02
Given log có usage, then hiển thị tổng chi phí ước tính và chi phí trung bình mỗi request theo quy tắc tính đã công bố.
AC-03
Given log có latency, then hiển thị độ trễ trung bình.
AC-04
Given request failed hoặc refused, then hiển thị số lượng và tỷ lệ tương ứng.
AC-05
Given AI request hoàn thành hoặc thất bại, then log lưu prompt version, model, tools called, tokens, latency và status khi dữ liệu khả dụng.
AC-06
Given bộ lọc thời gian, then thống kê thay đổi tương ứng.
AC-07
Given role user, when truy cập admin dashboard/API, then hệ thống từ chối.
AC-08
Given admin xem log, then nội dung tài chính nhạy cảm không bị hiển thị không cần thiết.

 
5. Ma trận bao phủ yêu cầu của đề
YÊU CẦU
LIÊN KẾT US / ENGINEERING
OAuth2, JWT, RBAC
US-01, US-13, US-14
CRUD + persistent database
US-02, US-04, US-05, US-11
Search / filter / sort / pagination
US-03
File upload AI input
US-05, US-06
AI B – LLM gọi ≥3 real tools; confirm writes
US-09, US-10; bắt buộc có tool-call logs/test
AI C – JSON schema validated + app logic
US-06, US-07
AI D – Image processed, stored and used
US-05, US-06
Real-time / streaming
US-12
Admin usage: count, cost, latency, failed/refused
US-14
Guardrails + AI fallback
US-06, US-07, US-12, US-13; test/demo riêng
Privacy + user isolation
US-01, US-02, US-05, US-09, US-13
Responsive, API-wide validation, secrets, deployment
Engineering Backlog / NFR tests
Model rationale, prompts, 20 AI eval before/after
Engineering Backlog / AI Quality
Traceability to code/test, diagram, 3 ADR, AI_USAGE
Engineering Backlog / Documentation
M1/M2/M3, report, slides, video, defense
Milestone & Deliverables Checklist

 
6. Ghi chú triển khai và phạm vi ngoài User Stories
Đề yêu cầu nhóm 3 người triển khai ít nhất 3 AI capabilities. Nhóm chốt B+C+D; không bắt buộc RAG, không chọn multi-agent. SQL xử lý phép tính tài chính chính xác; LLM chỉ diễn giải và điều phối tools.
Các yêu cầu bắt buộc nhưng KHÔNG phải User Story: prompt lưu trong files/config và version trong Git; lựa chọn model dựa trên quality/cost/speed/privacy; 3 guardrails có demo; ≥20 AI evaluation cases gồm normal/edge/should-refuse với pass rate trước/sau cải tiến; log mỗi AI request; unit tests; responsive desktop/mobile; validation trên mọi API; không lộ secrets trong repo hoặc Git history; Docker Compose hoặc hosted demo; kiến trúc; ≥3 ADR; AI_USAGE.md có 2 lỗi AI-generated code thực tế; ownership và commits của từng thành viên.
M1 cần: topic, user group và problem; 8–15 US có AC; chọn AI capabilities; sơ đồ kiến trúc đầu tiên. Không được ghi các API/source/test dự kiến là đã triển khai hoặc đã kiểm chứng.
7. Nguồn và tình trạng tài liệu
Căn cứ: Final Project Assignment: Guidelines – New Technologies in Software Engineering, Academic Year 2026–2027, Sections 1–11. Tài liệu này là bản đề xuất User Stories cho M1, chưa phải báo cáo nghiệm thu code.


