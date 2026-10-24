const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  Footer,
  PageNumber
} = require('docx');

const FONT = 'Times New Roman';
const COLOR_PRIMARY = '1F4E79';   // Deep Navy Blue
const COLOR_SECONDARY = '2E75B6'; // Classic Blue
const COLOR_TEXT = '262626';      // Dark Charcoal
const COLOR_MUTED = '595959';     // Medium Gray
const COLOR_BORDER = 'D9D9D9';    // Light Border
const COLOR_BG_LIGHT = 'F2F4F8';  // Soft Light Gray/Blue

function pTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 34, // 17pt
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function pSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 180 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 24, // 12pt
        bold: true,
        color: COLOR_SECONDARY,
      }),
    ],
  });
}

function pHeading1(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 28, // 14pt
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function pHeading2(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 26, // 13pt
        bold: true,
        color: COLOR_SECONDARY,
      }),
    ],
  });
}

function pBullet(boldPrefix, text) {
  return new Paragraph({
    spacing: { before: 40, after: 60, line: 276 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: '•  ',
        font: FONT,
        size: 24,
        bold: true,
        color: COLOR_SECONDARY,
      }),
      ...(boldPrefix ? [
        new TextRun({
          text: boldPrefix + ' ',
          font: FONT,
          size: 24,
          bold: true,
          color: COLOR_TEXT,
        }),
      ] : []),
      new TextRun({
        text: text,
        font: FONT,
        size: 24,
        color: COLOR_TEXT,
      }),
    ],
  });
}

function pSubBullet(boldPrefix, text) {
  return new Paragraph({
    spacing: { before: 30, after: 50, line: 276 },
    indent: { left: 720 },
    children: [
      new TextRun({
        text: '-  ',
        font: FONT,
        size: 24,
        bold: true,
        color: COLOR_MUTED,
      }),
      ...(boldPrefix ? [
        new TextRun({
          text: boldPrefix + ' ',
          font: FONT,
          size: 24,
          bold: true,
          color: COLOR_TEXT,
        }),
      ] : []),
      new TextRun({
        text: text,
        font: FONT,
        size: 24,
        color: COLOR_TEXT,
      }),
    ],
  });
}

function pBody(text, options = {}) {
  return new Paragraph({
    spacing: { before: 40, after: 60, line: 276 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 24,
        color: COLOR_TEXT,
        italic: options.italic || false,
        bold: options.bold || false,
      }),
    ],
  });
}

function buildMetaTable() {
  const rows = [
    ['Học kỳ / Năm học:', 'Học kỳ 1 (2026 – 2027)'],
    ['Thời gian thực hiện:', '12/10/2026 – 18/10/2026 (Ngày bắt đầu tuần 1: 16/09/2026)'],
    ['Epic thực hiện:', 'TLCN-130 — Nghiệp vụ Đào tạo & Liên thông Dữ liệu Học vụ'],
    ['Nhánh Git & Trạng thái:', 'feat/TLCN-134-leave-attendance-sync-and-admission-code (Đã merge vào nhánh Develop qua Pull Request #15)'],
  ];

  const tableRows = rows.map(([label, val]) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 2600, type: WidthType.DXA },
          shading: { fill: COLOR_BG_LIGHT },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  font: FONT,
                  size: 22, // 11pt
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 6800, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: val,
                  font: FONT,
                  size: 22,
                  color: COLOR_TEXT,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 9400, type: WidthType.DXA },
    rows: tableRows,
  });
}

async function generateDocx() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 24,
            color: COLOR_TEXT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440, // 1 inch
              left: 1440,   // 1 inch
              right: 1440,  // 1 inch
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Trang ',
                    font: FONT,
                    size: 20,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: 20,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          pTitle('BÁO CÁO TIẾN ĐỘ TUẦN 5'),
          pSubtitle('ĐỒ ÁN TỐT NGHIỆP: EDUMOET — HỆ THỐNG QUẢN LÝ TRƯỜNG HỌC ĐA TRƯỜNG'),

          buildMetaTable(),

          pHeading1('1. Mục tiêu Tuần 5'),
          pBullet('', 'Hiện thực hóa luồng liên thông dữ liệu học vụ khép kín: chuyển đổi hồ sơ tuyển sinh trúng tuyển sang tài khoản học sinh chính thức, tự động sinh mã học sinh chuẩn hóa.'),
          pBullet('', 'Tự động hóa đồng bộ đơn xin nghỉ phép đã duyệt (APPROVED) với trạng thái điểm danh có phép (EXCUSED_ABSENT) trên phân hệ Điểm danh.'),
          pBullet('', 'Tự động hóa đồng bộ điểm số bài tập trực tuyến vào sổ điểm và ma trận điểm lớp học (GPA Summary Matrix).'),
          pBullet('', 'Cung cấp tính năng gợi ý điểm danh thông minh theo Thời khóa biểu tuần để tối ưu hóa thao tác cho giáo viên.'),
          pBullet('', 'Mở rộng phân hệ Khảo thí: hỗ trợ nhập hàng loạt ngân hàng câu hỏi và đề thi từ file Excel (.xlsx) và văn bản Word (.docx/txt).'),
          pBullet('', 'Chuẩn hóa toàn bộ trải nghiệm người dùng (UX), modal thao tác, nhãn điều hướng, gom đợt thu học phí theo lớp và thông báo tiếng Việt.'),
          pBullet('', 'Bảo đảm 100% kiểm thử hồi quy (regression), hợp đồng định tuyến API (Route Contract), E2E test selectors và build tối ưu đạt chuẩn.'),

          pHeading1('2. Kết quả công việc đã hoàn thành'),
          pHeading2('a. Liên thông Tuyển sinh sang Hồ sơ Học sinh & Cấp mã học sinh tự động'),
          pBullet('Quy trình nhập học tự động:', 'Bổ sung tính năng chuyển trạng thái hồ sơ tuyển sinh từ trúng tuyển (APPROVED) sang học sinh chính thức (ENROLLED).'),
          pBullet('Tự động sinh mã học sinh chuẩn hóa:', 'Tích hợp bộ tạo mã học sinh tự động dạng HS{YYYY}{4 chữ số ngẫu nhiên} (ví dụ: HS20268492), giúp nhà trường không phải nhập mã thủ công và bảo đảm tính duy nhất trong toàn hệ thống.'),
          pBullet('Tạo tài khoản & Phân lớp:', 'Tự động tạo bản ghi người dùng với vai trò STUDENT, cấp tài khoản đăng nhập, liên kết thông tin phụ huynh (parent), gắn vào lớp học tiếp nhận và lưu lịch sử nhập học trong audit log.'),
          pBullet('Bảo toàn dữ liệu tuyển sinh:', 'Giữ nguyên hồ sơ ứng tuyển gốc để đối chiếu khi cần và ngăn chặn tạo trùng lặp học sinh cho cùng một hồ sơ tuyển sinh.'),

          pHeading2('b. Tự động đồng bộ Đơn xin nghỉ phép sang Điểm danh'),
          pBullet('Liên thông đơn nghỉ phép đã duyệt:', 'Khi đơn xin nghỉ phép của học sinh được giáo viên/nhà trường duyệt (APPROVED), hệ thống tự động đối soát với danh sách điểm danh của lớp trong khoảng thời gian nghỉ tương ứng.'),
          pBullet('Tự động gắn trạng thái Nghỉ có phép:', 'Tự động chuyển đổi trạng thái điểm danh sang EXCUSED_ABSENT (Nghỉ có phép) kèm nhãn trực quan "Nghỉ phép (đã duyệt)" trên giao diện Điểm danh.'),
          pBullet('Tối ưu hóa thao tác cho giáo viên:', 'Giáo viên khi thực hiện điểm danh theo ngày/tiết học sẽ thấy ngay học sinh đã được duyệt phép, loại bỏ hoàn toàn việc phải kiểm tra chéo thủ công giữa sổ giấy và phần mềm.'),

          pHeading2('c. Đồng bộ Điểm Bài tập Online & Ma trận GPA Lớp học'),
          pBullet('Đồng bộ điểm tự động:', 'Xây dựng cơ chế liên kết điểm bài tập trực tuyến (HomeworkSubmission) đã chấm sang sổ điểm thành phần của lớp học theo đúng môn học và học kỳ.'),
          pBullet('Ma trận tổng hợp GPA:', 'Bổ sung bảng tổng hợp điểm trung bình môn, điểm tích lũy học kỳ và phân loại học lực (Giỏi, Khá, Trung bình, Yếu) cho từng lớp học, phục vụ công tác đánh giá của giáo viên chủ nhiệm và ban giám hiệu.'),
          pBullet('Lọc điểm linh hoạt:', 'Cung cấp bộ lọc theo lớp, môn học, học kỳ và trạng thái nhập điểm trên giao diện quản lý điểm.'),

          pHeading2('d. Gợi ý Điểm danh Thông minh theo Thời khóa biểu'),
          pBullet('Smart Attendance Suggestion:', 'Tự động đối chiếu Thời khóa biểu tuần hiện tại của giáo viên/lớp học với ngày giờ thực tế để gợi ý nhanh môn học và tiết học cần điểm danh.'),
          pBullet('Tối ưu trải nghiệm:', 'Giáo viên chỉ cần một thao tác bấm để nạp sẵn danh sách học sinh theo lớp và tiết tương ứng, tránh việc phải chọn thủ công nhiều cấp dropdown.'),

          pHeading2('e. Import Ngân hàng Câu hỏi & Đề thi từ Excel / Word'),
          pBullet('API Import chuyên dụng:', 'Xây dựng 2 endpoint mới POST /import/exams/parse và POST /import/exams cho phép kiểm tra trước (preview) và nhập chính thức dữ liệu đề thi vào ngân hàng câu hỏi.'),
          pBullet('Parser đa định dạng:', 'Phát triển bộ tách câu hỏi (exam-parser.js) hỗ trợ các cú pháp câu hỏi tiếng Việt phổ biến, tự động bóc tách câu hỏi trắc nghiệm, các lựa chọn (A, B, C, D), đáp án đúng và câu hỏi tự luận.'),
          pBullet('Giao diện Import trực quan:', 'Tích hợp nút nhập file, khu vực xem trước câu hỏi đã parse, kiểm tra lỗi cú pháp trước khi lưu vào ngân hàng đề thi.'),

          pHeading2('f. Chuẩn hóa UX, Giao diện & Căn chỉnh E2E Test Suite'),
          pBullet('Loại bỏ hộp thoại nguyên thủy:', 'Thay thế toàn bộ các lệnh window.prompt bằng Modal chuẩn Ant Design (bắt buộc nhập lý do khi từ chối hồ sơ tuyển sinh hoặc hủy tài liệu).'),
          pBullet('Thu phí gom theo lớp:', 'Cho phép kế toán chọn nhanh toàn bộ học sinh của một lớp để tạo đợt thu học phí hàng loạt.'),
          pBullet('VNPay Auto-polling:', 'Bổ sung cơ chế tự động thăm dò trạng thái giao diện thanh toán VNPay để cập nhật tức thì khi có kết quả từ cổng thanh toán.'),
          pBullet('Căn chỉnh E2E Test Selectors:', 'Chuẩn hóa tiêu đề Modal xác nhận, nhãn aria và selector bộ lọc học phí theo lớp trong FeesPage.jsx, LeavePage.jsx và bộ kịch bản E2E Playwright fee-line-items.spec.js.'),

          pHeading2('g. Kiểm thử tự động hóa toàn diện (Full Test Suite)'),
          pBullet('Hợp đồng định tuyến API:', 'Khắc phục độ lệch hợp đồng trong route-contract.fixture.json cho 2 endpoint import đề thi mới, xác nhận hợp đồng API đạt chuẩn 100%.'),
          pBullet('Kết quả kiểm thử tự động ghi nhận trên hệ thống:', ''),
          pSubBullet('Backend Tests:', '291 / 291 tests PASSED (100%).'),
          pSubBullet('Frontend Unit Tests:', '13 / 13 tests PASSED (100%).'),
          pSubBullet('Frontend Production Build:', '100% thành công, 0 lỗi, 0 warning (Main bundle 91.58 kB, build 32.87s).'),
          pSubBullet('Tổng cộng kiểm thử tự động:', '304 / 304 bài kiểm thử unit & integration đạt kết quả tuyệt đối.'),

          pHeading2('h. Quản lý mã nguồn & Quy trình Git'),
          pBullet('Pull Request & Merge:', 'Hoàn tất nhánh tính năng feat/TLCN-134-leave-attendance-sync-and-admission-code, mở Pull Request #15 và merge thành công vào nhánh chính Develop tại commit 2f3938b.'),
          pBullet('Trạng thái kho mã nguồn:', 'Working tree hiện tại trên Develop hoàn toàn sạch sẽ (clean), sẵn sàng bước sang kế hoạch Tuần 6.'),

          pHeading1('3. Khó khăn gặp phải & Giải pháp xử lý'),
          pBullet('Khó khăn 1 — Lệch snapshot Route Contract test:', 'Khi bổ sung 2 endpoint mới cho import đề thi (/import/exams/parse, /import/exams), bài test hợp đồng định tuyến route-contract.test.js báo lỗi do snapshot fixture cũ chưa cập nhật.'),
          pSubBullet('Giải pháp:', 'Đối chiếu diff giữa danh sách routes thực tế trên api.routes.js và route-contract.fixture.json, bổ sung chính xác 2 route vào fixture để bảo đảm kiểm soát hợp đồng API chặt chẽ.'),

          pBullet('Khó khăn 2 — Định dạng câu hỏi đa dạng trong file thực tế:', 'Cú pháp đề thi trong file Word/Text thực tế tại các trường học rất đa dạng (ví dụ: Câu 1., Câu 1:, 1., A., A/,... kèm khoảng trắng ngắt dòng).'),
          pSubBullet('Giải pháp:', 'Thiết kế bộ regex parser linh hoạt với cơ chế chuẩn hóa khoảng trắng và xử lý lỗi mềm (graceful fallback), đồng thời bổ sung kịch bản unit test riêng cho parser trong parse-exam-text.test.js để đảm bảo độ tin cậy.'),

          pBullet('Khó khăn 3 — Bất đồng bộ giữa duyệt phép và điểm danh:', 'Trạng thái đơn xin nghỉ phép duyệt bất đồng bộ qua giao diện quản lý đơn, trong khi giao diện điểm danh hoạt động theo ngày/tiết cụ thể của thời khóa biểu, dễ dẫn tới lệch trạng thái hiển thị nếu không đồng bộ kịp thời.'),
          pSubBullet('Giải pháp:', 'Tích hợp logic truy vấn đối soát các đơn nghỉ phép đã APPROVED ngay khi nạp bảng điểm danh lớp, tự động ánh xạ sang mã trạng thái EXCUSED_ABSENT và khóa chỉnh sửa ghi đè trái phép.'),

          pBullet('Khó khăn 4 — Lệch locator modal trong kiểm thử E2E:', 'Modal xác nhận thao tác và bộ lọc học phí trong E2E Playwright test bị trượt selector do thay đổi nhãn tiếng Việt trên giao diện.'),
          pSubBullet('Giải pháp:', 'Chuẩn hóa thuộc tính aria-label và các data-testid trên modal xác nhận và bộ chọn phạm vi lớp học, đảm bảo bộ test E2E chạy ổn định, độc lập với thay đổi chuỗi ngôn ngữ hiển thị.'),

          pHeading1('4. Kế hoạch Tuần 6 (Epic TLCN-130: Dạy học trực tuyến nâng cao & Khởi động Staging)'),
          pBullet('Học liệu & Bài tập nâng cao:', ''),
          pSubBullet('', 'Hoàn thiện vòng đời nộp bài tập trực tuyến với đính kèm đa file (FileAsset, dung lượng tối đa 10 MB, hỗ trợ PDF, ảnh, Office).'),
          pSubBullet('', 'Quy trình giáo viên chấm bài, cho điểm thành phần và gửi nhận xét phản hồi (feedback) hai chiều.'),
          pSubBullet('', 'Quy trình soạn, nộp duyệt giáo án điện tử có kiểm tra phân công chuyên môn và lưu vết lịch sử phiên bản (revisions).'),

          pBullet('Phân hệ Khảo thí & Thi trực tuyến:', ''),
          pSubBullet('', 'Kiểm tra toàn diện vòng đời làm bài thi trực tuyến: giới hạn thời lượng server-side, đồng hồ đếm ngược tự nộp bài, chống gian lận nộp muộn.'),
          pSubBullet('', 'Cơ chế trộn câu hỏi và đảo thứ tự đáp án ngẫu nhiên theo từng lượt thi (attempt).'),
          pSubBullet('', 'Cơ chế tự động lưu bản nháp câu trả lời (autosave & resume) khi học sinh bị mất kết nối mạng.'),

          pBullet('Khởi động môi trường Preview / Staging tự động:', ''),
          pSubBullet('', 'Thiết lập môi trường chạy thử Staging qua Docker Compose và pipeline GitHub Actions theo cam kết tiêu chí Mức 5 (TC5.2).'),
          pSubBullet('', 'Tự động hóa kiểm tra liveness/readiness probe và đo thời gian commit-to-preview.'),

          pBullet('Chuẩn bị UAT:', ''),
          pSubBullet('', 'Lập danh sách ứng viên UAT (>= 10 người dùng mục tiêu thuộc các vai trò: Quản trị, Giáo viên, Học sinh, Phụ huynh).'),
          pSubBullet('', 'Soạn thảo kịch bản đo độ hoàn thành nhiệm vụ và phiếu khảo sát chỉ số khả dụng hệ thống (SUS).'),

          pHeading1('5. Khai báo Sử dụng AI (AI Usage Log)'),
          pBullet('Công cụ AI:', 'Antigravity AI Assistant'),
          pBullet('Phiên bản / Model:', 'Gemini 3.8 Flash (High)'),
          pBullet('Prompt đã dùng:', '"Đọc toàn bộ dự án, đọc cả plan, kiểm tra git log các commit trong tuần, chạy lại toàn bộ test suite backend và frontend build; cập nhật hoàn chỉnh báo cáo tiến độ Tuần 5 phản ánh đầy đủ việc liên thông đơn nghỉ phép sang điểm danh, sinh mã học sinh tự động, ma trận GPA, import đề thi Excel/Word, kết quả 291/291 backend tests và merge PR #15 vào Develop theo đúng chuẩn Rubric 15 tuần."'),
          pBullet('Nội dung AI tạo ra:', ''),
          pSubBullet('', 'Cập nhật file snapshot hợp đồng định tuyến ExpressJS/src/tests/common/contracts/route-contract.fixture.json bổ sung 2 endpoint import đề thi.'),
          pSubBullet('', 'Hỗ trợ xây dựng hàm đồng bộ đơn nghỉ phép với trạng thái điểm danh EXCUSED_ABSENT trong AttendancePage.jsx và tự động sinh mã học sinh studentCode trong AdmissionsPage.jsx.'),
          pSubBullet('', 'Căn chỉnh selector cho modal xác nhận và bộ lọc học phí trong FeesPage.jsx và fee-line-items.spec.js.'),
          pSubBullet('', 'Tổng hợp, phân tích số liệu thực tế và soạn thảo toàn diện báo cáo tiến độ Tuần 5 trong docs/planning/weekly-report-week-5.md và xuất tài liệu Word docs/planning/weekly-report-week-5.docx.'),
          pBullet('Phần sinh viên đã sửa / hoàn thiện:', ''),
          pSubBullet('', 'Trực tiếp chạy và giám sát toàn bộ 304 bài kiểm thử trên môi trường local (291 backend test, 13 frontend test) và build production.'),
          pSubBullet('', 'Kiểm tra tính nhất quán của các mã trạng thái điểm danh và mã học sinh sinh ra trong thực tế cơ sở dữ liệu.'),
          pSubBullet('', 'Rà soát code diff, tạo Pull Request #15, kiểm tra CI pipeline và thực hiện merge vào nhánh Develop.'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, '../../docs/planning/weekly-report-week-5.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully created DOCX report at:', outPath, 'Bytes:', buffer.length);
}

generateDocx().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
