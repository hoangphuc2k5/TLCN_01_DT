# Kế hoạch đóng các khoảng trống chức năng

Cập nhật: 10/09/2026. Nhánh nền hiện hành: `integration/phase2`; Phase 3 tiếp tục xử lý các giới hạn còn lại bằng MongoDB local tạm.

## Các mục trong danh sách ban đầu

| Spec | Trạng thái code | Tài liệu |
| --- | --- | --- |
| 2.6 — 2FA, chính sách mật khẩu | Đã làm và kiểm thử local | `phase1-auth-security.md` |
| 2.7 — Backup/Restore | Đã làm và kiểm thử local | `phase1-backup-restore.md` |
| 4.6 — Tuyển sinh online | Đã làm và kiểm thử local | `phase2-online-admissions.md` |
| 4.10 — Khen thưởng/kỷ luật | Đã làm và kiểm thử local | `phase2-rewards-discipline.md` |
| 5.4–5.5 — Hồ sơ scan, chứng nhận PDF/Word | Đã có kho hồ sơ và xuất PDF/RTF Word-compatible; cần nâng lên DOCX thật ở Phase 3 | `phase2-student-dossiers-certificates.md` |
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
- [ ] 3.2 File đính kèm bài nộp online qua `FileAsset`, kiểm tra quyền và vòng đời file.
- [ ] 3.3 Tin nhắn realtime thay cho chỉ REST, có scope hội thoại và kết nối lại.
- [ ] 3.4 Xuất học bạ Word dạng `.docx` thật và rà lại nội dung học bạ điện tử.
- [ ] 3.5 Rà soát tổng hợp quyền/menu, regression backend/frontend/E2E và tạo nhánh `integration/phase3`.

Các kiểm chứng cần hệ thống bên ngoài không thể được kết luận bằng test DB local: Atlas Network Access/TLS, terminal VNPay được duyệt và callback HTTPS công khai, S3/IAM, Google SSO, SMTP, SMS/Zalo/push. Phần code dùng adapter và test giả; UAT thật được ghi riêng, không gọi là đạt khi chưa có credential hoặc nhà cung cấp chưa kích hoạt.
