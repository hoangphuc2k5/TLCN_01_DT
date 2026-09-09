import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  downloadCertificateApi,
  downloadStudentDocumentApi,
  getStudentDocumentsApi,
  getUserDirectoryApi,
  uploadStudentDocumentApi,
} from '../../api';
import { can } from '../../util/permissions';

const TYPE_LABELS = {
  IDENTITY: 'Identity', BIRTH_CERTIFICATE: 'Birth certificate', TRANSCRIPT: 'Transcript', HEALTH: 'Health', OTHER: 'Other',
};

const StudentDocumentsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'student_documents', 'create');
  const [rows, setRows] = useState([]); const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false); const [file, setFile] = useState(null); const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(''); const [form] = Form.useForm();
  const load = async () => { const result = await getStudentDocumentsApi(); if (result?.EC === 0) setRows(result.data || []); };
  useEffect(() => { load(); if (canManage) getUserDirectoryApi({ role: 'STUDENT', limit: 300 }).then(result => result?.EC === 0 && setStudents(result.data || [])); }, []);

  const personalStudents = useMemo(() => {
    const map = new Map();
    rows.forEach(row => { const id = row.studentId?._id || row.studentId; if (id) map.set(String(id), row.studentId); });
    if (user?.role === 'STUDENT') map.set(String(user._id), user);
    (user?.parentOf || []).forEach(id => map.set(String(id?._id || id), id));
    return [...map.values()];
  }, [rows, user]);
  const certificateStudentId = selectedStudent || (user?.role === 'STUDENT' ? user._id : personalStudents[0]?._id || personalStudents[0]);
  const certButtons = id => id && <Space><Button size="small" onClick={() => downloadCertificateApi(id, 'pdf').catch(e => message.error(e.message))}>PDF</Button><Button size="small" onClick={() => downloadCertificateApi(id, 'doc').catch(e => message.error(e.message))}>Word</Button></Space>;

  return <Space direction="vertical" style={{ width: '100%' }}>
    <Card title="Student documents" extra={canManage && <Button type="primary" onClick={() => setOpen(true)}>Upload document</Button>}>
      {canManage && <Space wrap style={{ marginBottom: 16 }}><Select showSearch placeholder="Select student for transcript" value={selectedStudent || undefined} onChange={setSelectedStudent} options={students.map(s => ({ value: s._id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))} style={{ minWidth: 280 }} />{certButtons(certificateStudentId)}</Space>}
      {!canManage && certificateStudentId && <Typography.Paragraph>Export transcript: {certButtons(certificateStudentId)}</Typography.Paragraph>}
      <Table rowKey="_id" dataSource={rows} columns={[
        { title: 'Student', render: (_, row) => row.studentId?.name || row.studentId?.code || 'Student' },
        { title: 'Type', dataIndex: 'documentType', render: value => <Tag>{TYPE_LABELS[value] || value}</Tag> },
        { title: 'Title', dataIndex: 'title' },
        { title: 'File', render: (_, row) => <Button type="link" onClick={() => downloadStudentDocumentApi(row._id, row.fileAssetId?.originalName || row.title).catch(e => message.error(e.message))}>Download</Button> },
        { title: 'Uploaded by', render: (_, row) => row.uploadedBy?.name || '-' },
        !canManage && personalStudents.length > 1 ? { title: 'Transcript', render: (_, row) => certButtons(row.studentId?._id || row.studentId) } : {},
      ].filter(column => column.title)} />
    </Card>
    <Modal open={open} title="Upload student document" confirmLoading={saving} onCancel={() => !saving && setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async values => {
        if (!file) return message.error('Choose a file'); setSaving(true);
        try { const result = await uploadStudentDocumentApi(values, file); if (result?.EC !== 0) return message.error(result?.EM); message.success(result.EM || 'Uploaded'); setOpen(false); form.resetFields(); setFile(null); load(); }
        catch (error) { message.error(error.message || 'Upload failed'); } finally { setSaving(false); }
      }}>
        <Form.Item name="studentId" label="Student" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={students.map(s => ({ value: s._id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))} /></Form.Item>
        <Form.Item name="documentType" label="Document type" initialValue="OTHER" rules={[{ required: true }]}><Select options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input maxLength={180} /></Form.Item>
        <Form.Item label="File" extra="PDF, PNG/JPG, TXT, DOCX, XLSX or PPTX"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={event => setFile(event.target.files?.[0] || null)} /></Form.Item>
      </Form>
    </Modal>
  </Space>;
};

export default StudentDocumentsPage;
