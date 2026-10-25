import { useMemo, useState } from 'react';
import { Form, message } from 'antd';
import { downloadImportTemplateApi, parseExamQuestionsApi } from '../../services/api/files.api';
import { parseTextExam } from '../../utils/exam-parser';

const useExamQuestionDrafts = () => {
  const [questions, setQuestions] = useState([]);
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
    setQuestions((prev) => [...prev, ...parsed]);
    message.success(`Đã bóc tách thành công ${parsed.length} câu hỏi`);
    setPastedText('');
  };

  // Handle adding manual question
  const handleAddManual = (values) => {
    if (manualType === 'MCQ') {
      const options = [];
      if (values.optA) options.push({ key: 'A', text: values.optA });
      if (values.optB) options.push({ key: 'B', text: values.optB });
      if (values.optC) options.push({ key: 'C', text: values.optC });
      if (values.optD) options.push({ key: 'D', text: values.optD });
      if (options.length < 2) {
        return message.warning('Trắc nghiệm cần ít nhất 2 lựa chọn (A, B)');
      }
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type: 'MCQ',
        prompt: values.prompt,
        options,
        correctKey: values.correctKey || 'A',
        points: Number(values.points) || 1,
      };
      setQuestions((prev) => [...prev, newQ]);
    } else {
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type: 'ESSAY',
        prompt: values.prompt,
        options: [],
        correctKey: '',
        points: Number(values.points) || 2,
      };
      setQuestions((prev) => [...prev, newQ]);
    }
    manualForm.resetFields();
    manualForm.setFieldsValue({ type: manualType, points: manualType === 'MCQ' ? 1 : 2, correctKey: 'A' });
    message.success('Đã thêm câu hỏi vào đề');
  };

  // Remove question from list
  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q._tempId !== id));
  };

  // Stats
  const mcqCount = useMemo(() => questions.filter((q) => q.type === 'MCQ').length, [questions]);
  const essayCount = useMemo(() => questions.filter((q) => q.type === 'ESSAY').length, [questions]);
  const totalPoints = useMemo(
    () => questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0),
    [questions]
  );


  return { questions, setQuestions, importLoading, pastedText, setPastedText, manualForm, manualType, setManualType, downloadTemplate, handleUploadExcel, handleParseText, handleAddManual, removeQuestion, mcqCount, essayCount, totalPoints };
};

export default useExamQuestionDrafts;
