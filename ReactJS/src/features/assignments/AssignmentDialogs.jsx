import { Button, Form, Input, InputNumber, Modal, Popconfirm, Radio, Select, Space, Table, Tag, message } from 'antd';
import { createHomeworkApi, submitHomeworkApi, uploadHomeworkAttachmentApi, getHomeworkSubmissionsApi, gradeHomeworkApi, downloadHomeworkAttachmentApi, upsertGradeApi, createRetakeRequestApi } from '../../services/api/learning.api';

const AssignmentDialogs = ({ open, createTitle, setOpen, form, classes, subjects, years, teachers, isTeacher, loadHomeworks, submitTarget, setSubmitTarget, submitFile, setSubmitFile, submitForm, submissionMode, gradeTarget, setGradeTarget, submissions, setSubmissions, gradeForm, retakeOpen, setRetakeOpen, retakeForm, loadRetakes, formatDate, modeLabels, requestTypeLabels }) => (
  <>
    <Modal open={open} title={createTitle} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={640}>
      <Form form={form} layout="vertical" onFinish={async values => { const result = await createHomeworkApi({ ...values, dueAt: new Date(values.dueAt).toISOString(), availableFrom: values.availableFrom ? new Date(values.availableFrom).toISOString() : undefined }); if (result?.EC === 0) { message.success(result.EM); setOpen(false); loadHomeworks(); } else message.error(result?.EM); }}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="instructions" label="Đề bài / hướng dẫn"><Input.TextArea rows={5} maxLength={10000} /></Form.Item>
        <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}><Select options={classes.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select options={subjects.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select options={years.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        {!isTeacher && (
          <Form.Item name="teacherId" label="Giáo viên phụ trách" rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}>
            <Select
              placeholder="Chọn giáo viên đứng lớp"
              options={teachers.map(t => ({ value: t._id, label: `${t.name} (${t.email})` }))}
            />
          </Form.Item>
        )}
        <Form.Item name="dueAt" label="Hạn nộp" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item name="maxScore" label="Điểm tối đa" initialValue={10} rules={[{ required: true }]}><InputNumber min={0.1} max={100} /></Form.Item>
        <Form.Item name="allowLate" label="Cho phép nộp trễ" valuePropName="checked"><input type="checkbox" /></Form.Item>
        <Form.Item name="lateUntil" label="Hạn cuối nộp trễ"><Input type="datetime-local" /></Form.Item>
      </Form>
    </Modal>

    <Modal open={!!submitTarget} title={`Nộp bài: ${submitTarget?.title || ''}`} onCancel={() => { setSubmitTarget(null); setSubmitFile(null); }} onOk={() => submitForm.submit()}>
      <Form form={submitForm} layout="vertical" initialValues={{ submissionMode: 'WEB' }} onFinish={async values => {
        if (values.submissionMode === 'FILE' && !submitFile) return message.error('Hãy chọn file bài làm');
        const result = await submitHomeworkApi(submitTarget._id, values);
        if (result?.EC !== 0) return message.error(result?.EM);
        if (values.submissionMode === 'FILE') {
          const uploaded = await uploadHomeworkAttachmentApi(submitTarget._id, submitFile);
          if (uploaded?.EC !== 0) {
            message.error(`Chưa hoàn tất nộp bài: ${uploaded?.EM || 'Không tải được file'}`);
            await loadHomeworks();
            return;
          }
        }
        message.success(values.submissionMode === 'FILE' ? 'Đã nộp file bài làm' : 'Đã nộp bài trực tuyến');
        setSubmitTarget(null);
        setSubmitFile(null);
        loadHomeworks();
      }}>
        <Form.Item name="submissionMode" label="Hình thức nộp" rules={[{ required: true }]}>
          <Radio.Group options={[{ value: 'WEB', label: 'Làm trực tuyến' }, { value: 'FILE', label: 'Nộp file' }]} />
        </Form.Item>
        <Form.Item name="answerText" label={submissionMode === 'WEB' ? 'Nội dung bài làm' : 'Ghi chú'} rules={submissionMode === 'WEB' ? [{ required: true, whitespace: true }] : []}>
          <Input.TextArea rows={submissionMode === 'WEB' ? 10 : 4} maxLength={20000} showCount />
        </Form.Item>
        {submissionMode === 'FILE' && <Form.Item label="File bài làm" required>
          <input aria-label="File bài làm" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={event => setSubmitFile(event.target.files?.[0] || null)} />
        </Form.Item>}
      </Form>
    </Modal>

    <Modal open={!!gradeTarget} title={`Bài nộp: ${gradeTarget?.title || ''}`} onCancel={() => setGradeTarget(null)} footer={null} width={920}>
      <Space style={{ marginBottom: 12 }}>
        <Button
          size="small"
          type="primary"
          onClick={async () => {
            const graded = submissions.filter((s) => s.score != null);
            if (graded.length === 0) return message.warning('Chưa có bài nào được chấm điểm');
            let success = 0;
            for (const item of graded) {
              const classId = gradeTarget?.classId?._id || gradeTarget?.classId;
              const subjectId = gradeTarget?.subjectId?._id || gradeTarget?.subjectId;
              const academicYearId = gradeTarget?.academicYearId?._id || gradeTarget?.academicYearId;
              const studentId = item.studentId?._id || item.studentId;
              if (classId && subjectId && academicYearId && studentId) {
                const res = await upsertGradeApi({
                  academicYearId,
                  classId,
                  subjectId,
                  studentId,
                  semester: 1,
                  scores: [{ type: 'QUIZ_15', score: item.score, weight: 1, note: `Bài: ${gradeTarget?.title || ''}` }],
                  strategy: 'weighted',
                });
                if (res?.EC === 0) success += 1;
              }
            }
            message.success(`Đã đồng bộ ${success}/${graded.length} điểm vào sổ điểm môn học (cột 15 phút)!`);
          }}
        >
          Đồng bộ tất cả bài đã chấm vào sổ điểm (cột 15p)
        </Button>
      </Space>
      <Table size="small" rowKey="_id" dataSource={submissions} columns={[
        { title: 'Học sinh', render: (_, row) => row.studentId?.name || '' },
        { title: 'Hình thức', dataIndex: 'submissionMode', render: value => modeLabels[value] || value },
        { title: 'Nội dung', dataIndex: 'answerText', ellipsis: true },
        { title: 'File', render: (_, row) => <Space direction="vertical">{(row.attachmentIds || []).map(file => <Button type="link" size="small" key={file._id} onClick={() => downloadHomeworkAttachmentApi(file._id, file.originalName)}>{file.originalName}</Button>)}</Space> },
        { title: 'Thời gian nộp', dataIndex: 'submittedAt', render: formatDate },
        { title: 'Trễ', dataIndex: 'late', render: value => value ? 'Có' : 'Không' },
        { title: 'Điểm', dataIndex: 'score', render: value => value == null ? 'Chưa chấm' : value },
        {
          title: 'Thao tác',
          render: (_, row) => (
            <Space>
              {row.status === 'SUBMITTED' ? (
                <Button size="small" onClick={() => { gradeForm.resetFields(); gradeForm.setFieldsValue({ submissionId: row._id }); }}>Chấm bài</Button>
              ) : (
                <Tag color="green">Đã chấm</Tag>
              )}
              {row.score != null && (
                <Popconfirm
                  title="Đồng bộ điểm này vào sổ điểm (cột 15p)?"
                  okText="Đồng ý"
                  cancelText="Hủy"
                  onConfirm={async () => {
                    const classId = gradeTarget?.classId?._id || gradeTarget?.classId;
                    const subjectId = gradeTarget?.subjectId?._id || gradeTarget?.subjectId;
                    const academicYearId = gradeTarget?.academicYearId?._id || gradeTarget?.academicYearId;
                    const studentId = row.studentId?._id || row.studentId;
                    const res = await upsertGradeApi({
                      academicYearId,
                      classId,
                      subjectId,
                      studentId,
                      semester: 1,
                      scores: [{ type: 'QUIZ_15', score: row.score, weight: 1, note: `Bài: ${gradeTarget?.title || ''}` }],
                      strategy: 'weighted',
                    });
                    if (res?.EC === 0) message.success('Đã đồng bộ điểm vào sổ điểm môn học!');
                    else message.error(res?.EM || 'Không thể đồng bộ điểm');
                  }}
                >
                  <Button size="small" type="link">Vào sổ điểm</Button>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ]} />
      <Form form={gradeForm} layout="inline" onFinish={async values => { const result = await gradeHomeworkApi(values.submissionId, values); if (result?.EC === 0) { const refreshed = await getHomeworkSubmissionsApi(gradeTarget._id); setSubmissions(refreshed.data || []); gradeForm.resetFields(); message.success(result.EM); } else message.error(result?.EM); }} style={{ marginTop: 16 }}>
        <Form.Item name="submissionId" hidden><Input /></Form.Item>
        <Form.Item name="score" label="Điểm" rules={[{ required: true }]}><InputNumber min={0} max={gradeTarget?.maxScore} /></Form.Item>
        <Form.Item name="feedback" label="Nhận xét"><Input style={{ width: 300 }} maxLength={10000} /></Form.Item>
        <Button htmlType="submit" type="primary">Lưu</Button>
      </Form>
    </Modal>

    <Modal open={retakeOpen} title="Yêu cầu thi lại / học lại" onCancel={() => setRetakeOpen(false)} onOk={() => retakeForm.submit()}>
      <Form form={retakeForm} layout="vertical" onFinish={async values => { const result = await createRetakeRequestApi(values); if (result?.EC === 0) { message.success(result.EM); setRetakeOpen(false); retakeForm.resetFields(); loadRetakes(); } else message.error(result?.EM); }}>
        <Form.Item name="requestType" label="Loại yêu cầu" rules={[{ required: true }]}><Select options={Object.entries(requestTypeLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select options={subjects.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select options={years.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} showCount /></Form.Item>
      </Form>
    </Modal>
  </>
);

export default AssignmentDialogs;
