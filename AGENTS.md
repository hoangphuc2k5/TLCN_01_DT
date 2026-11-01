# Quy tắc Bắt buộc về Quy trình Git & Quản lý Nhánh (Git Workflow Rules)

Tài liệu này là **chỉ thị bắt buộc (Strict Behavioral Instructions)** dành cho AI Assistant và toàn bộ thành viên tham gia phát triển dự án EduMoet (TLCN). Mọi hành động vi phạm các quy tắc dưới đây đều bị nghiêm cấm.

---

## 1. NGUYÊN TẮC TỐI THƯỢNG: TUYỆT ĐỐI CẤM TỰ Ý MERGE & TỰ ACCEPT MR

1. **Tuyệt đối KHÔNG tự ý merge code** từ bất kỳ nhánh nào vào các nhánh chính (`Develop`, `develop`, `main`).
2. **Tuyệt đối KHÔNG tự tạo Pull Request / Merge Request rồi tự accept / merge** qua API, CLI hoặc bất kỳ hình thức tự động nào.
3. **Thao tác Review, Phê duyệt (Approve) và Chấp nhận (Accept/Merge) MR là THAO TÁC THỦ CÔNG 100%**:
   * Chỉ có **NGƯỜI DÙNG (Sinh viên / Maintainer)** mới có quyền xem xét code diff, kiểm tra CI và tự tay bấm nút Merge trên giao diện web GitHub.
   * AI Assistant không được thay thế con người thực hiện việc merge này dưới bất kỳ lý do gì.

---

## 2. TUYỆT ĐỐI KHÔNG ĐƯỢC CODE THẲNG TRÊN NHÁNH `DEV` / `DEVELOP`

1. Nhánh `Develop` (và `main`) là **nhánh bảo vệ (Protected Branch)**, đại diện cho trạng thái ổn định đã qua tích hợp.
2. **CẤM:**
   * Không được checkout nhánh `Develop` để viết mã, sửa lỗi hoặc thêm tính năng.
   * Không được tạo commit trực tiếp trên nhánh `Develop`.
   * Không được dùng lệnh `git push origin Develop` khi đang thực hiện các task tính năng/sửa lỗi.
3. Mọi công việc **BẮT BUỘC** phải diễn ra trên một **nhánh mới (Feature/Fix branch)**.

---

## 3. QUY ĐỊNH TẠO NHÁNH MỚI (BRANCHING STRATEGY)

Mỗi khi bắt đầu một công việc mới (dù là thêm tính năng, sửa bug, viết test, tối ưu UI hay viết tài liệu):
1. **Bắt buộc rẽ nhánh mới từ `origin/Develop` mới nhất**:
   ```bash
   git fetch origin
   git checkout -b <loai-nhanh>/<ten-tinh-nang-ngan-gon> origin/Develop
   ```
2. **Quy ước đặt tên nhánh:**
   * Tính năng mới: `feat/<jira-id>-<short-description>` (Ví dụ: `feat/TLCN-131-online-exams`)
   * Sửa lỗi: `fix/<jira-id>-<short-description>` (Ví dụ: `fix/TLCN-132-attendance-timezone`)
   * Kiểm thử: `test/<short-description>` (Ví dụ: `test/homework-submission-boundary`)
   * Tối ưu/Tái cấu trúc: `refactor/<short-description>`

---

## 4. QUY TRÌNH CHUẨN CỦA AI ASSISTANT KHI HOÀN THÀNH MỘT TASK

Khi hoàn thành phần việc được giao, AI Assistant chỉ được thực hiện theo đúng các bước sau:

```
[Bắt đầu Task]
       │
       ▼
1. Tạo nhánh mới từ Develop (git checkout -b feat/...)
       │
       ▼
2. Lập trình & Viết kiểm thử trên nhánh mới
       │
       ▼
3. Chạy toàn bộ Test & Build:
   - Backend: npm test (ExpressJS)
   - Frontend: npm test & npm run build (ReactJS)
       │
       ▼
4. Commit thay đổi có ý nghĩa (Conventional Commits), nếu phù hợp với yêu cầu.
       │
       ▼
5. Báo cáo kết quả và tên nhánh hiện tại cho người dùng.
       │
       ▼
6. DỪNG LẠI; KHÔNG TỰ PUSH.
   - Chỉ push khi người dùng yêu cầu rõ ràng việc push.
   - Ngay trước khi push, phải thông báo chính xác tên nhánh sẽ được push.
   - Nếu chưa có yêu cầu push rõ ràng, để thay đổi trên local và chờ chỉ dẫn tiếp theo.
   - Không tự tạo PR/MR; chờ người dùng yêu cầu riêng nếu cần.
```

---

## 5. BẢNG TỔNG HỢP: NHỮNG ĐIỀU ĐƯỢC PHÉP VÀ BỊ CẤM

| Hành động | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| Tạo nhánh mới từ `Develop` | ✅ **BẮT BUỘC** | Mỗi task một nhánh riêng |
| Code và commit trên nhánh tính năng mới | ✅ **CHO PHÉP** | Commit message rõ ràng, đúng quy ước |
| Push nhánh tính năng mới lên `origin` | ⚠️ **CHỈ KHI NGƯỜI DÙNG YÊU CẦU RÕ** | Trước khi push phải thông báo chính xác tên nhánh; không tự push |
| Chạy test, linter, build trên nhánh tính năng | ✅ **BẮT BUỘC** | Phải xanh 100% trước khi thông báo |
| Code thẳng trên nhánh `Develop` hoặc `main` | ❌ **NGHIÊM CẤM** | Làm bẩn lịch sử và mất tính an toàn |
| Commit trực tiếp vào `Develop` | ❌ **NGHIÊM CẤM** | Không thể hiện được quy trình PR review |
| Tự chạy lệnh `git merge` vào `Develop` | ❌ **NGHIÊM CẤM** | Mất cơ hội review của sinh viên/GVHD |
| Tự tạo MR và tự bấm Approve / Merge | ❌ **NGHIÊM CẤM** | Vi phạm nguyên tắc kiểm soát thủ công |
| Force push (`git push -f`) lên `Develop` hoặc `main` | ❌ **NGHIÊM CẤM** | Trừ khi có sự đồng ý trực tiếp của người dùng để sửa lỗi |

---

*Quy định này có hiệu lực xuyên suốt toàn bộ quá trình thực hiện đồ án tốt nghiệp.*
