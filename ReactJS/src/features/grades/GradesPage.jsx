import { useEffect, useMemo, useState } from 'react';
import { Form, Tabs, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  getAcademicYearsApi,
  getClassesApi,
  getGradesApi,
  getSubjectsApi,
  downloadExport,
} from '../../services/api.service';
import { can, canExport } from '../../utils/permissions';
import GradebookPanel from './GradebookPanel';
import GradeEntryModal from './GradeEntryModal';
import GradeSummaryPanel from './GradeSummaryPanel';

const GradesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canEnter = can(user, 'grades', 'create') && can(user, 'grades', 'update');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [filterClass, setFilterClass] = useState(null);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterSemester, setFilterSemester] = useState(null);
  const [summaryClassId, setSummaryClassId] = useState(null);
  const [summarySemester, setSummarySemester] = useState(1);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getGradesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      const [c, s, y] = await Promise.all([
        getClassesApi(),
        getSubjectsApi(),
        getAcademicYearsApi(),
      ]);
      if (c?.EC === 0) {
        setClasses(c.data || []);
        if (c.data?.length > 0) setSummaryClassId(c.data[0]._id);
      }
      if (s?.EC === 0) setSubjects(s.data || []);
      if (y?.EC === 0) setYears(y.data || []);
      load();
    })();
  }, []);

  const displayRows = rows.filter((r) => {
    if (filterClass && (r.classId?._id || r.classId) !== filterClass) return false;
    if (filterSubject && (r.subjectId?._id || r.subjectId) !== filterSubject) return false;
    if (filterSemester && r.semester !== filterSemester) return false;
    return true;
  });

  const getClassificationTag = (cls) => {
    if (!cls) return '—';
    const upper = String(cls).toUpperCase();
    if (['GIỎI', 'XUẤT SẮC', 'GIOI', 'EXCELLENT'].includes(upper)) {
      return <Tag color="green">{upper === 'EXCELLENT' ? 'Xuất sắc' : cls}</Tag>;
    }
    if (['KHÁ', 'KHA', 'GOOD'].includes(upper)) {
      return <Tag color="blue">{upper === 'GOOD' ? 'Tốt' : cls}</Tag>;
    }
    if (['TRUNG BÌNH', 'TB', 'AVERAGE'].includes(upper)) {
      return <Tag color="orange">{upper === 'AVERAGE' ? 'Trung bình' : cls}</Tag>;
    }
    return <Tag color="red">{upper === 'WEAK' ? 'Yếu' : cls}</Tag>;
  };

  const summaryData = useMemo(() => {
    if (!summaryClassId) return { students: [], subjects: [], stats: { excellent: 0, good: 0, average: 0, weak: 0 } };
    const classGrades = rows.filter(
      (r) => (r.classId?._id || r.classId) === summaryClassId && r.semester === summarySemester
    );
    const subMap = new Map();
    classGrades.forEach((g) => {
      const sId = g.subjectId?._id || g.subjectId;
      const sName = g.subjectId?.name || 'Môn';
      if (sId && !subMap.has(String(sId))) subMap.set(String(sId), { id: sId, name: sName });
    });
    const subList = [...subMap.values()];

    const stuMap = new Map();
    classGrades.forEach((g) => {
      const stId = g.studentId?._id || g.studentId;
      const stName = g.studentId?.name || 'Học sinh';
      const stCode = g.studentId?.code || '';
      if (!stId) return;
      if (!stuMap.has(String(stId))) {
        stuMap.set(String(stId), { id: stId, name: stName, code: stCode, scores: {} });
      }
      const entry = stuMap.get(String(stId));
      entry.scores[String(g.subjectId?._id || g.subjectId)] = g.average;
    });

    const stuList = [...stuMap.values()].map((st) => {
      const scoreVals = Object.values(st.scores).filter((v) => v != null && !isNaN(v));
      const gpa = scoreVals.length > 0 ? Number((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(2)) : null;
      let classification = '—';
      if (gpa != null) {
        const minScore = Math.min(...scoreVals);
        if (gpa >= 8.0 && minScore >= 6.5) classification = 'GIỎI';
        else if (gpa >= 6.5 && minScore >= 5.0) classification = 'KHÁ';
        else if (gpa >= 5.0 && minScore >= 3.5) classification = 'TRUNG BÌNH';
        else classification = 'YẾU';
      }
      return { ...st, gpa, classification };
    });

    const stats = { excellent: 0, good: 0, average: 0, weak: 0 };
    stuList.forEach((st) => {
      if (st.classification === 'GIỎI') stats.excellent += 1;
      else if (st.classification === 'KHÁ') stats.good += 1;
      else if (st.classification === 'TRUNG BÌNH') stats.average += 1;
      else if (st.classification === 'YẾU') stats.weak += 1;
    });

    return { students: stuList, subjects: subList, stats };
  }, [rows, summaryClassId, summarySemester]);

  const exportClassGradeSummary = () => {
    if (!summaryData.students.length) {
      message.warning('Không có dữ liệu điểm để xuất');
      return;
    }
    const currentClassName = classes.find((c) => c._id === summaryClassId)?.name || 'Lop';
    const headerRow = [
      'STT',
      'Mã Học Sinh',
      'Họ và Tên',
      ...summaryData.subjects.map((s) => s.name),
      'Điểm TB Chung',
      'Xếp Loại Học Lực',
    ];

    const dataRows = summaryData.students.map((st, idx) => {
      const subjectScores = summaryData.subjects.map((s) => {
        const val = st.scores[String(s.id)];
        return val != null ? val : '';
      });
      return [
        idx + 1,
        st.code || '',
        `"${(st.name || '').replace(/"/g, '""')}"`,
        ...subjectScores,
        st.gpa != null ? st.gpa : '',
        st.classification || '',
      ].join(',');
    });

    const csvContent =
      '\uFEFF' +
      [
        `"BẢNG TỔNG HỢP ĐIỂM VÀ GPA LỚP: ${currentClassName.toUpperCase()} - HỌC KỲ ${summarySemester}"`,
        `"Thời gian xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}"`,
        '',
        headerRow.join(','),
        ...dataRows,
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Diem_Tong_Ket_${currentClassName}_HK${summarySemester}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.success('Đã xuất bảng điểm tổng kết lớp thành công');
  };

  return (
    <div>
      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: 'details',
            label: 'Sổ điểm chi tiết các môn',
            children: (
              <GradebookPanel canEnter={canEnter} canExportGrades={canExport(user, 'grades')} onOpenEntry={() => setOpen(true)} onImportDone={load} onExport={() => downloadExport('grades')} classes={classes} subjects={subjects} displayRows={displayRows} getClassificationTag={getClassificationTag} filterClass={filterClass} setFilterClass={setFilterClass} filterSubject={filterSubject} setFilterSubject={setFilterSubject} filterSemester={filterSemester} setFilterSemester={setFilterSemester} />
            ),
          },
          {
            key: 'summary',
            label: 'Bảng tổng kết ĐTB & Học lực cả lớp',
            children: (
<GradeSummaryPanel summaryData={summaryData} classes={classes} summaryClassId={summaryClassId} setSummaryClassId={setSummaryClassId} summarySemester={summarySemester} setSummarySemester={setSummarySemester} canExport={canExport(user, 'grades')} onExport={exportClassGradeSummary} getClassificationTag={getClassificationTag} />
            ),
          },
        ]}
      />
      <GradeEntryModal
        open={open}
        setOpen={setOpen}
        form={form}
        years={years}
        classes={classes}
        students={students}
        setStudents={setStudents}
        subjects={subjects}
        load={load}
      />
    </div>
  );
};

export default GradesPage;
