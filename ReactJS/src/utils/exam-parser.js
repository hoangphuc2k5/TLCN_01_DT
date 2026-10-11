/**
 * Bóc tách văn bản đề thi trắc nghiệm và tự luận (chuẩn Aiken / định dạng đề thi phổ thông Việt Nam)
 * @param {string} text
 * @returns {Array<{ prompt: string, type: 'MCQ'|'ESSAY', options: Array<{key: string, text: string}>, correctKey: string, points: number, _tempId: string }>}
 */
export const parseTextExam = (text) => {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result = [];
  let current = null;

  const pushCurrent = () => {
    if (!current || !current.prompt) return;
    if (current.options && current.options.length >= 2) {
      current.type = 'MCQ';
      if (!current.correctKey) current.correctKey = 'A';
      current.points = current.points || 1;
    } else {
      current.type = 'ESSAY';
      current.options = [];
      current.correctKey = '';
      current.points = current.explicitPoints !== undefined ? current.explicitPoints : 2;
    }
    const { explicitPoints, ...clean } = current;
    result.push({
      ...clean,
      _tempId: `txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    });
    current = null;
  };

  for (const line of lines) {
    const qMatch = line.match(/^(?:Câu\s*\d+[\s:.-]+|\d+[\s:.)-]+)(.*)$/i);
    const ansMatch = line.match(/^(?:Đáp\s*án|Dap\s*an|Answer|Key)[\s:.-]*([A-D])/i);
    const optMatch = line.match(/^([A-D])[\s:.)-]+(.*)$/i);

    if (ansMatch) {
      if (current) current.correctKey = ansMatch[1].toUpperCase();
    } else if (optMatch) {
      if (current) {
        current.options.push({ key: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
      }
    } else if (qMatch) {
      pushCurrent();
      current = {
        prompt: qMatch[1].trim() || line,
        options: [],
        correctKey: '',
        points: 1,
      };
    } else {
      if (current) {
        if (!current.options.length) {
          current.prompt += ' ' + line;
        } else {
          current.options[current.options.length - 1].text += ' ' + line;
        }
      } else {
        current = {
          prompt: line,
          options: [],
          correctKey: '',
          points: 1,
        };
      }
    }
  }
  pushCurrent();
  return result;
};
