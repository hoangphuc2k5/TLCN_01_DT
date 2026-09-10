# Phase 2.1 — Xin nghỉ dạy và lịch dạy bù

Cập nhật 08/09/2026. Spec liên quan: **5.8 / 6.1.10**. Nền: `feat/phase1-backup-restore` tại `a25f216`. Nhánh chức năng: `feat/phase2-teaching-schedule`. Code/test tại `fc4825e`, đã push lên origin; main và integration/phase0 không thay đổi.

## Phạm vi đã làm

- Đơn nghỉ dạy được duyệt tự đánh dấu các tiết của giáo viên trong khoảng ngày thành **Nghỉ dạy** trên lịch theo ngày. Không sửa mảng tiết lặp hằng tuần; ngày ngoài khoảng nghỉ vẫn học bình thường.
- Giáo viên chọn một tiết nghỉ đã duyệt, ngày/tiết/phòng bù. Server tự xác định lớp, môn, năm học, giáo viên từ tiết gốc; không tin các ID này do client gửi.
- Người duyệt xem đầy đủ tiết gốc và đề xuất bù. Chỉ đơn bù APPROVED xuất hiện trên lịch của giáo viên/lớp/học sinh/phụ huynh.
- Duyệt kiểm tra lại phân công, trạng thái giáo viên, tiết gốc, năm học, đơn nghỉ, lịch nghỉ ở ngày đích, trùng giáo viên/lớp/phòng và tiết gốc đã có bù hay chưa. Đơn vẫn PENDING khi kiểm tra thất bại.
- Hủy lịch bù đã duyệt có lý do, người hủy và thời điểm. Giữ người duyệt/lịch sử đề xuất cũ; gỡ tiết bù khỏi lịch theo ngày. Giáo viên có thể gửi đơn thay thế. Hai lệnh hủy cạnh tranh chỉ một lệnh thành công.
- Chặn duyệt đơn nghỉ mới đè lên lịch bù đã duyệt. Người quản lý hủy lịch bù, xử lý đơn nghỉ rồi giáo viên gửi lịch bù khác.
- Khi lưu/duyệt TKB, chặn một lớp có hai môn cùng tiết, ngày/tiết không nguyên; khi duyệt kiểm tra trùng với TKB lớp khác trong năm học giao nhau và với lịch bù đã duyệt.
- Giữ scope trường/cụm/lớp phân công/con em. Lịch theo ngày chỉ populate tên cần hiển thị; không trả lý do nghỉ, nhận xét duyệt hoặc thông tin liên hệ của giáo viên.

## Kiến trúc và tính nhất quán

| Thành phần | Trách nhiệm |
| --- | --- |
| `scheduleDates.js` | Ngày YYYY-MM-DD, thứ, tiết, khoảng ngày, chuẩn hóa phòng |
| `timetableScope.js` | Scope chung cho TKB tuần và bản chiếu lịch theo ngày |
| `teachingScheduleService.js` | Bản chiếu lịch, dựng snapshot tiết bù và kiểm tra xung đột |
| `scheduleTransaction.js` | Transaction và điểm ghi chung trên School để tuần tự hóa các thay đổi lịch trong một trường |
| `leaveService.js` | Quyền/nghiệp vụ tạo, duyệt, từ chối, hủy; phát sự kiện sau commit |
| `timetableService.js` | Lưu/duyệt TKB, kiểm tra tham chiếu, gọi policy lịch |
| `MakeupFields.jsx` / `DatedSchedulePanel.jsx` | Form chọn tiết nghỉ và bảng lịch theo ngày |

`School.scheduleRevision` là trường nội bộ (select false). Mọi lưu/duyệt TKB, duyệt nghỉ dạy/dạy bù và hủy lịch bù đều ghi vào cùng document School **trước khi đọc lịch trong transaction**. Transaction cạnh tranh được retry và đọc trạng thái sau giao dịch thắng; không dựa vào thao tác “kiểm tra rồi ghi” độc lập. Các truy vấn kiểm tra lịch trong transaction dùng cùng session, thực hiện tuần tự.

Đơn APPROVED là nguồn dữ liệu cho các ngoại lệ theo ngày; không tạo một bản sao tiết bù riêng cần đồng bộ. Transaction commit đơn cũng làm ngoại lệ trở thành có hiệu lực khi lịch được đọc lại. Chỉ phát `leave.reviewed` sau commit; listener đã phân biệt thông báo hủy lịch bù. Observer/Notification vẫn có giới hạn về khoảng trống giữa commit và lưu thông báo như Phase 1.2; chưa là transactional outbox, không có WebSocket/push tức thời.

Cơ chế này bảo vệ các đường ghi lịch nêu trên. Chỉnh trực tiếp database hoặc các luồng đổi lớp/phân công/năm học ngoài module chưa dùng khóa lịch này; không coi đây là giải pháp migration đồng thời xuyên mọi service.

## Hợp đồng API

### Lịch theo ngày

`GET /v1/api/timetables/schedule?fromDate=2026-09-07&toDate=2026-09-13`

- Bắt buộc fromDate/toDate theo `YYYY-MM-DD`, từ 1 đến 31 ngày, bao gồm hai đầu.
- Filter tùy chọn: classId, academicYearId, schoolId; filter chỉ thu hẹp scope hiện hành.
- Quyền: `timetable.view`, hoặc `own_data.view` cho STUDENT/PARENT/SUBJECT_TEACHER/HOMEROOM_TEACHER với scope cá nhân/lớp hiện hành. Custom role chỉ có own_data không được nâng thành quyền xem toàn trường.
- Mỗi dòng có date, period, room, classId, subjectId, teacherId, academicYearId, key và kind: REGULAR / CANCELLED / MAKEUP.
- CANCELLED có timetableId và absenceId để giáo viên chọn tiết nghỉ. MAKEUP có leaveId, ngày/tiết gốc và các tham chiếu snapshot.
- Không sửa endpoint TKB tuần cũ để trả kiểu dữ liệu khác. Lịch bù vẫn xuất hiện nếu TKB tuần đang chuyển về DRAFT để sửa.

### Tạo đơn bù

`POST /v1/api/leave-requests` (201)

```json
{
  "type": "MAKEUP_CLASS",
  "reason": "Bù tiết đã nghỉ",
  "fromDate": "2026-09-08",
  "toDate": "2026-09-08",
  "makeup": {
    "absenceId": "<ID đơn nghỉ đã duyệt>",
    "timetableId": "<ID TKB đã duyệt>",
    "originalDate": "2026-09-07",
    "originalPeriod": 1,
    "date": "2026-09-08",
    "period": 4,
    "room": "P201"
  }
}
```

Ngày fromDate/toDate lưu cho MAKEUP được chuẩn hóa về makeup.date. Mỗi đơn tương ứng một tiết gốc và một tiết bù. Ngày bù phải sau ngày nghỉ, nằm trong cùng năm học; phòng tối đa 100 ký tự. Phân công phải khớp giáo viên/lớp/môn/năm học tại lúc gửi và duyệt.

### Duyệt / hủy

- `PATCH /v1/api/leave-requests/:id/review` với status APPROVED hoặc REJECTED: giữ đường API/quyền hiện hành. Không tự duyệt. GVCN chỉ duyệt nghỉ học của lớp mình, không duyệt nghỉ dạy/dạy bù.
- `PATCH /v1/api/leave-requests/:id/cancel-makeup` với `{ "note": "Lý do hủy" }`: SCHOOL_ADMIN / ACADEMIC_AFFAIRS / CLUSTER_ADMIN, có `leave.execute`, cùng phạm vi và không tự hủy duyệt đơn của mình. note sau trim từ 1–1000 ký tự.
- Hủy chỉ áp dụng cho MAKEUP_CLASS đang APPROVED. Trạng thái CANCELLED giữ cancelledBy/cancelledAt/cancellationNote riêng với reviewedBy/reviewNote.
- 400: payload/ngày/tiết không hợp lệ. 403/404: quyền/phạm vi. 409: trạng thái hoặc lịch xung đột/thay đổi. 503: MongoDB standalone không hỗ trợ transaction.

## Cấu hình, tương thích và vận hành

- Không thêm dependency hay biến môi trường. **Cần MongoDB replica set** cho ghi/duyệt lịch; standalone trả 503 và không đổi trạng thái đơn/TKB. Đọc lịch và xử lý nghỉ học vẫn hoạt động theo luồng cũ.
- Thêm `LeaveRequest.makeup`, các trường hủy và index truy vấn lịch, `School.scheduleRevision`. Không migration phá dữ liệu; các trường có default hoặc tùy chọn.
- `makeupProposal` dạng văn bản cũ vẫn hiển thị. Đơn cũ thiếu makeup không được đoán ngày/tiết để tạo lịch: pending có thể từ chối rồi gửi lại; approved cũ không tự tạo tiết, có thể hủy rồi gửi đề xuất chuẩn mới.
- Ngày là ngày lịch trường, không phải timestamp. T2 = 1, CN = 7; tiết 1–10. Đơn nghỉ dạy mới yêu cầu ngày thuần và tối đa 366 ngày. Date cũ khi chiếu lấy phần ngày UTC; cần rà soát riêng nếu dữ liệu cũ dùng giờ/múi giờ để biểu diễn nửa ngày.
- Phòng so sánh sau trim, Unicode NFC, không phân biệt hoa/thường trong cùng trường. Phòng trống không giữ chỗ phòng. Đây là tên phòng trên TKB; chưa nối với FacilityRequest hoặc tài sản phòng.
- TKB tuần vẫn dùng vòng đời cũ: lưu lại chuyển DRAFT, tiết tuần tạm không công bố cho HS/PH cho đến khi duyệt. Tiết bù APPROVED được giữ độc lập. Chưa có phiên bản TKB với ngày hiệu lực để bảo toàn mọi thay đổi lịch sử.
- Lịch bù được làm mới khi tải lại/xem lịch. Việc duyệt không tự thay điểm danh hoặc điểm số đã ghi.
- Chưa có nghỉ từng tiết/nửa ngày, giáo viên dạy thay, một đơn bù nhiều tiết, tự tìm khung giờ tối ưu, nghỉ lễ, học kỳ/ca học, hay hủy duyệt đơn nghỉ dạy. Mỗi tiết bù cần giáo viên đề xuất và người có quyền duyệt.
- Không kết nối Atlas, không gửi SMTP/SMS/Zalo hoặc sửa các `.env` thực tế trong phiên này. Khả năng vận hành trên Atlas thật chưa được xác nhận từ các test local.

## Kiểm thử

- Backend toàn bộ: **192/192 đạt**, gồm 26 ca nghiệp vụ lịch mới và 1 ca standalone mới. Các test khác giữ nguyên ý nghĩa, test scope TKB standalone cập nhật để xác nhận trả 503 và giữ DRAFT.
- Kiểm tra API thật trên MongoMemoryReplSet: pending/rejected/student absence không sửa lịch; phạm vi trường/cha mẹ/GV; giả ID; ngày không tồn tại; năm học; trạng thái GV/phân công; tiết gốc đổi; trùng lớp/GV/phòng; lịch tuần và bù; duyệt/hủy cạnh tranh; hủy và gửi lại; tương thích đơn cũ.
- Standalone test thật xác nhận transaction thất bại trước callback ghi và revision không tăng. Fixture export-scope có thư mục file tạm riêng để không ghi file test vào kho ứng dụng khi cấu hình fixture thay đổi.
- Frontend policy: **10/10 đạt**; build đạt, còn cảnh báo chunk lớn có từ trước.
- Playwright có 2 ca mới: GV gửi nghỉ → admin duyệt → GV đề xuất bù → admin duyệt → PH xem → admin hủy → PH xem lại; HS trường khác chỉ thấy lịch của mình và nhận lỗi khi chọn quá 31 ngày. **Bộ E2E đầy đủ 31/31 đạt**, bao gồm 29 ca cũ và 2 ca mới (luồng chính cũng kiểm tra hủy). `git diff --check` đạt.

## Cách tiếp tục

1. Đọc `docs/implementation-progress.md`, kiểm tra nhánh/status trước khi sửa. Không merge main hoặc integration/phase0 tự động.
2. Nếu mở rộng lịch: ưu tiên phiên bản TKB theo ngày hiệu lực, nghỉ từng tiết và liên kết phòng tài sản. Các đường ghi mới phải dùng chung scheduleTransaction để giữ quy tắc chống trùng.
3. Nếu đi tiếp nghiệp vụ khác: giao/nộp/chấm bài tập (6.1.4–6.1.6) là một phần còn thiếu; cần mở rộng purpose/scope kho FileAsset, quy tắc hạn nộp/chấm và quyền phụ huynh, không tái sử dụng quyền học liệu chỉ bằng kiểm tra role.
4. Hoàn thành từng chức năng → chạy test phù hợp → nhánh riêng, commit/push → ghi code/test/giới hạn vào file tiến trình.
