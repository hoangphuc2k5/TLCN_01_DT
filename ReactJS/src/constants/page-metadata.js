const PAGE_METADATA = Object.freeze({
  '/clusters': 'Cụm trường',
  '/subscriptions': 'Gói dịch vụ',
  '/schools': 'Trường học',
  '/users': 'Người dùng',
  '/roles': 'Vai trò và quyền',
  '/classes': 'Lớp học',
  '/grades': 'Điểm số',
  '/fees': 'Học phí',
  '/payroll': 'Bảng lương',
  '/equipment-maintenance': 'Bảo trì thiết bị',
  '/monitoring': 'Giám sát hệ thống',
  '/school-comparison': 'Đối chiếu liên trường',
  '/appointments': 'Lịch hẹn phụ huynh',
  '/rewards': 'Thi đua và khen thưởng',
  '/announcements': 'Thông báo',
  '/messages': 'Tin nhắn',
  '/calendar': 'Lịch sự kiện',
  '/leave': 'Đơn nghỉ và dạy bù',
  '/profile': 'Hồ sơ cá nhân',
  '/exams': 'Thi trực tuyến',
  '/materials': 'Học liệu',
  '/library': 'Thư viện',
  '/facilities': 'Cơ sở vật chất',
  '/audit-logs': 'Nhật ký kiểm toán',
  '/support': 'Hỗ trợ',
  '/conduct': 'Hạnh kiểm',
  '/templates': 'Mẫu thông báo',
  '/assignments': 'Bài tập',
  '/contact-book': 'Sổ liên lạc',
  '/class-life': 'Sinh hoạt lớp',
  '/activities': 'Câu lạc bộ và môn tự chọn',
  '/student-documents': 'Hồ sơ học sinh',
});

const PAGES_WITH_LOCAL_HEADING = new Set([
  '/dashboard',
  '/attendance',
  '/admissions',
  '/timetable',
  '/jobs',
  '/lesson-plans',
  '/roles',
]);

export const getPageMetadata = (pathname) => {
  if (PAGES_WITH_LOCAL_HEADING.has(pathname)) return null;
  const title = PAGE_METADATA[pathname];
  return title ? { title } : null;
};
