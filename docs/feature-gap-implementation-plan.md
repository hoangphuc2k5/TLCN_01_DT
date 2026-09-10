# Kế hoạch đóng các khoảng trống chức năng

Cập nhật: 10/09/2026. Nhánh tổng hợp hiện hành: `integration/phase3`; Phase 3 tiếp tục xử lý các giới hạn còn lại bằng MongoDB local tạm.

## Các mục trong danh sách ban đầu

| Spec | Trạng thái code | Tài liệu |
| --- | --- | --- |
| 2.6 — 2FA, chính sách mật khẩu | Đã làm và kiểm thử local | `phase1-auth-security.md` |
| 2.7 — Backup/Restore | Đã làm và kiểm thử local | `phase1-backup-restore.md` |
| 4.6 — Tuyển sinh online | Đã làm và kiểm thử local | `phase2-online-admissions.md` |
| 4.10 — Khen thưởng/kỷ luật | Đã làm và kiểm thử local | `phase2-rewards-discipline.md` |
| 5.4–5.5 — Hồ sơ scan, chứng nhận PDF/Word | Đã có kho hồ sơ, PDF phân trang và DOCX thật; xuất có audit | `phase2-student-dossiers-certificates.md`, `phase3-docx-transcripts.md` |
| 5.8 / 6.1.10 — Nghỉ dạy, dạy bù cập nhật TKB | Đã làm và kiểm thử local | `phase2-teaching-schedule.md` |
| 6.1.4–6.1.6 — Bài tập online, giáo án duyệt | Bài tập đã có; giáo án hoàn thành ở Phase 3.1; file bài nộp còn ở Phase 3.2 | `phase2-online-assignments.md`, `phase3-lesson-plan-approval.md` |
| 6.2.3, 6.2.5–6.2.6 — Sổ liên lạc, sinh hoạt lớp, họp PH | Đã làm và kiểm thử local | `phase2-contact-book.md`, `phase2-parent-meetings.md` |
| 7.6, 7.8 — CLB, thi lại/học lại | Đã làm và kiểm thử local | `phase2-clubs-retakes.md` |
| 8.4 — Thanh toán qua cổng | Đã tích hợp VNPay và kiểm thử chữ ký local; terminal sandbox thật chưa được VNPay duyệt | `phase2-vnpay-sandbox.md` |
| 8.6, 8.8 — Hẹn giáo viên, khảo sát | Đã làm và kiểm thử local | `phase2-appointments-surveys.md` |
| 9.2, 9.4, 9.6 — Khoản thu, nhắc nợ, lương | Đã làm và kiểm thử local | `phase2-fees-payroll.md` |
| 10.4 — Bảo trì thiết bị | Đã làm và kiểm thử local | `phase2-equipment-maintenance.md` |
| 11.1–11.2 — SSO, SĐT, realtime | Đã có SSO assertion, OTP SĐT, notification SSE và adapter kênh; dịch vụ thật cần credential/UAT | `phase2-sso-phone-realtime.md` |

## Phase 3 — phần code còn lại

- [x] 3.1 Soạn giáo án và quy trình gửi/duyệt có revision, lịch sử và notification.
- [x] 3.2 File đính kèm bài nộp online qua `FileAsset`, kiểm tra quyền và vòng đời file.
- [x] 3.3 Tin nhắn realtime thay cho chỉ REST, có scope hội thoại và kết nối lại.
- [x] 3.4 Xuất học bạ Word dạng `.docx` thật và rà lại nội dung học bạ điện tử.
- [x] 3.5 Rà soát tổng hợp quyền/menu và chạy regression cuối trên `integration/phase3`.

## Phase 4 — hoàn thiện chi tiết đặc tả DOCX

- [x] 4.1 Vòng đời thi online: giới hạn thời lượng server, tự chốt lượt quá hạn, thứ tự câu hỏi theo lượt và đồng hồ đếm ngược.

Kiểm thử Phase 4.1 đã chạy bằng MongoDB local: backend **241/241**, frontend policy **11/11**, build đạt. Các mục chi tiết khác trong DOCX vẫn được theo dõi ở phần audit và sẽ triển khai theo từng nhánh có kiểm thử riêng.

Regression cuối đã chạy trên nhánh `feat/phase3-final-regression` bằng MongoDB Memory ReplSet và fixture local; kết quả backend **238/238**, frontend policy **11/11**, build đạt và Playwright **43/43**. Các lỗi được kiểm chứng trong suite là các nhánh từ chối quyền/dữ liệu không hợp lệ, không phải test thất bại.

Các kiểm chứng cần hệ thống bên ngoài không thể được kết luận bằng test DB local: Atlas Network Access/TLS, terminal VNPay được duyệt và callback HTTPS công khai, S3/IAM, Google SSO, SMTP, SMS/Zalo/push. Phần code dùng adapter và test giả; UAT thật được ghi riêng, không gọi là đạt khi chưa có credential hoặc nhà cung cấp chưa kích hoạt.
