import { useMemo, useState } from 'react';
import { Form, message } from 'antd';
import { downloadImportTemplateApi, parseExamQuestionsApi } from '../../services/api/files.api';
import { parseTextExam } from '../../utils/exam-parser';

const useExamQuestionDrafts = () => {
  const [questions, setQuestions] = useState([]);
  const [template, setTemplate] = useState('CUSTOM');
  const [sections, setSections] = useState([{ key: 'section_1', title: 'Phần 1', instructions: '', order: 0, questionType: null }]);
  const [importLoading, setImportLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [manualForm] = Form.useForm();
  const [manualType, setManualType] = useState('MCQ');

  // Download template Excel for questions
  const downloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplateApi('exams');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-import-de-thi.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Không tải được file mẫu');
    }
  };

  // Upload Excel file to parse questions
  const handleUploadExcel = async (file) => {
    setImportLoading(true);
    try {
      const res = await parseExamQuestionsApi(file);
      if (res?.EC === 0) {
        const parsed = (res.data?.questions || []).map((q, idx) => ({
          ...q,
          _tempId: `xl_${Date.now()}_${idx}`,
          sectionKey: sections.find(section => !section.questionType || section.questionType === q.type)?.key || '',
          order: questions.length + idx,
        }));
        setQuestions((prev) => [...prev, ...parsed]);
        message.success(`Đã nạp ${parsed.length} câu hỏi từ file Excel`);
      } else {
        message.error(res?.EM || 'Không đọc được câu hỏi từ file');
      }
    } catch (err) {
      message.error(err?.response?.data?.EM || 'Lỗi khi đọc file Excel');
    } finally {
      setImportLoading(false);
    }
    return false;
  };

  // Handle parsing text
  const handleParseText = () => {
    if (!pastedText.trim()) {
      return message.warning('Vui lòng dán nội dung đề thi vào ô văn bản');
    }
    const parsed = parseTextExam(pastedText);
    if (!parsed.length) {
      return message.warning('Không tìm thấy câu hỏi hợp lệ trong đoạn văn bản');
    }
    const assigned = parsed.map((question, idx) => ({
      ...question,
      sectionKey: sections.find(section => !section.questionType || section.questionType === question.type)?.key || '',
      order: questions.length + idx,
    }));
    setQuestions((prev) => [...prev, ...assigned]);
    message.success(`Đã bóc tách thành công ${parsed.length} câu hỏi`);
    setPastedText('');
  };

  // Handle adding manual question
  const handleAddManual = (values) => {
    const selectedSection = sections.find(section => section.key === values.sectionKey);
    const type = selectedSection?.questionType || values.type || manualType;
    if (type === 'MCQ' || type === 'MCQ_MULTI') {
      const options = [];
      if (values.optA) options.push({ key: 'A', text: values.optA });
      if (values.optB) options.push({ key: 'B', text: values.optB });
      if (values.optC) options.push({ key: 'C', text: values.optC });
      if (values.optD) options.push({ key: 'D', text: values.optD });
      if (options.length < 2) {
        return message.warning('Trắc nghiệm cần ít nhất 2 lựa chọn (A, B)');
      }
      const correctKeys = type === 'MCQ_MULTI' ? (values.correctKeys || []) : [];
      if (type === 'MCQ_MULTI' && (!correctKeys.length || correctKeys.some(key => !options.some(option => option.key === key)))) {
        return message.warning('Hãy chọn ít nhất một đáp án đúng');
      }
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type,
        prompt: values.prompt,
        options,
        correctKey: type === 'MCQ' ? (values.correctKey || 'A') : '',
        correctKeys,
        sectionKey: values.sectionKey || '',
        order: questions.filter(question => question.sectionKey === values.sectionKey).length,
        points: Number(values.points) || 1,
      };
      setQuestions((prev) => [...prev, newQ]);
    } else if (type === 'TRUE_FALSE_4') {
      const statements = [1, 2, 3, 4].map(index => ({
        text: String(values[`statement${index}`] || '').trim(),
        correctAnswer: values[`correctAnswer${index}`] === 'true',
      }));
      if (statements.some((statement, index) => !statement.text || !['true', 'false'].includes(values[`correctAnswer${index + 1}`]))) {
        return message.warning('Nhập đủ 4 ý và chọn đáp án Đúng/Sai cho từng ý');
      }
      setQuestions((prev) => [...prev, {
        _tempId: `man_${Date.now()}`,
        type,
        prompt: values.prompt,
        statements,
        sectionKey: values.sectionKey || '',
        order: questions.filter(question => question.sectionKey === values.sectionKey).length,
        points: Number(values.points) || 1,
      }]);
    } else if (type === 'SHORT_ANSWER') {
      const acceptedAnswers = String(values.acceptedAnswers || '').split(/\r?\n/u).map(value => value.trim()).filter(Boolean);
      if (!acceptedAnswers.length) return message.warning('Nhập ít nhất một đáp án được chấp nhận');
      setQuestions((prev) => [...prev, {
        _tempId: `man_${Date.now()}`,
        type,
        prompt: values.prompt,
        acceptedAnswers,
        sectionKey: values.sectionKey || '',
        order: questions.filter(question => question.sectionKey === values.sectionKey).length,
        points: Number(values.points) || 0.25,
      }]);
    } else {
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type,
        prompt: values.prompt,
        options: [],
        correctKey: '',
        sectionKey: values.sectionKey || '',
        order: questions.filter(question => question.sectionKey === values.sectionKey).length,
        points: Number(values.points) || 2,
      };
      setQuestions((prev) => [...prev, newQ]);
    }
    manualForm.resetFields();
    manualForm.setFieldsValue({ type: manualType, points: manualType === 'MCQ' ? 0.25 : manualType === 'TRUE_FALSE_4' ? 1 : manualType === 'SHORT_ANSWER' ? 0.25 : 2, correctKey: 'A', sectionKey: selectedSection?.key || sections[0]?.key });
    message.success('Đã thêm câu hỏi vào đề');
  };

  // Remove question from list
  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q._tempId !== id));
  };

  const updateQuestion = (id, updates) => {
    setQuestions(previous => previous.map(question => question._tempId === id ? { ...question, ...updates } : question));
  };

  // Stats
  const mcqCount = useMemo(() => questions.filter((q) => ['MCQ', 'MCQ_MULTI'].includes(q.type)).length, [questions]);
  const essayCount = useMemo(() => questions.filter((q) => q.type === 'ESSAY').length, [questions]);
  const totalPoints = useMemo(
    () => questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0),
    [questions]
  );


  return { questions, setQuestions, template, setTemplate, sections, setSections, importLoading, pastedText, setPastedText, manualForm, manualType, setManualType, downloadTemplate, handleUploadExcel, handleParseText, handleAddManual, removeQuestion, updateQuestion, mcqCount, essayCount, totalPoints };
};

export default useExamQuestionDrafts;
