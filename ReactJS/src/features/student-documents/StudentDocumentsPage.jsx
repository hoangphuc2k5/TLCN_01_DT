import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  downloadCertificateApi,
  downloadStudentDocumentApi,
  downloadTranscriptSnapshotApi,
  getTranscriptHistoryApi,
  getStudentDocumentsApi,
  getUserDirectoryApi,
  fetchStudentDocumentBlobApi,
} from '../../services/api.service';
import { can } from '../../utils/permissions';
import FilePreviewModal from '../../components/FilePreviewModal';
import DocumentUploadModal from './DocumentUploadModal';

const TYPE_LABELS = {
  IDENTITY: 'Giấy tờ tùy thân',
  BIRTH_CERTIFICATE: 'Giấy khai sinh',
  TRANSCRIPT: 'Học bạ',
  HEALTH: 'Hồ sơ sức khỏe',
  OTHER: 'Khác',
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const StudentDocumentsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'student_documents', 'create');
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [preview, setPreview] = useState({
    open: false,
    loading: false,
    error: null,
    title: '',
    fileName: '',
    fileUrl: '',
    mimeType: '',
    sizeBytes: null,
    onDownload: null,
  });
  const [form] = Form.useForm();

  const handlePreviewDocument = async (row) => {
    const docName = row.fileAssetId?.originalName || row.title || 'Hồ sơ học sinh';
    setPreview({
      open: true,
      loading: true,
      error: null,
      title: row.title || 'Hồ sơ học sinh',
      fileName: docName,
      fileUrl: '',
      mimeType: '',
      sizeBytes: null,
      onDownload: () => downloadStudentDocumentApi(row._id, docName).catch(e => message.error(e.message)),
    });
    try {
      const res = await fetchStudentDocumentBlobApi(row._id, docName);
      setPreview((prev) => ({
        ...prev,
        loading: false,
        fileName: res.fileName,
        fileUrl: res.url,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
      }));
    } catch (err) {
      setPreview((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Không thể tải tệp xem trước',
      }));
    }
  };

  const closePreview = () => {
    if (preview.fileUrl) {
      URL.revokeObjectURL(preview.fileUrl);
    }
    setPreview({
      open: false,
      loading: false,
      error: null,
      title: '',
      fileName: '',
      fileUrl: '',
      mimeType: '',
      sizeBytes: null,
      onDownload: null,
    });
  };


  const load = useCallback(async () => {
    const result = await getStudentDocumentsApi();
    if (result?.EC === 0) setRows(result.data || []);
  }, []);

  useEffect(() => {
    load();
    if (canManage) {
      getUserDirectoryApi({ role: 'STUDENT', limit: 300 })
        .then(result => result?.EC === 0 && setStudents(result.data || []));
    }
  }, [canManage, load]);

  const personalStudents = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      const id = row.studentId?._id || row.studentId;
      if (id) map.set(String(id), row.studentId);
    });
    if (user?.role === 'STUDENT') map.set(String(user._id), user);
    (user?.parentOf || []).forEach(id => map.set(String(id?._id || id), id));
    return [...map.values()];
  }, [rows, user]);

  const certificateStudentId = selectedStudent || (user?.role === 'STUDENT' ? user._id : personalStudents[0]?._id || personalStudents[0]);

  const loadHistory = async (id) => {
    if (!id) return setHistory([]);
    const result = await getTranscriptHistoryApi(id);
    if (result?.EC === 0) setHistory(result.data || []);
  };

  useEffect(() => { loadHistory(certificateStudentId); }, [certificateStudentId]);

  const exportCurrent = async (id, format) => {
    try { await downloadCertificateApi(id, format); await loadHistory(id); }
    catch (error) { message.error(error.message); }
  };

  const certButtons = (id) => id && (
    <Space>
      <Button size="small" onClick={() => exportCurrent(id, 'pdf')}>PDF</Button>
      <Button size="small" onClick={() => exportCurrent(id, 'docx')}>Word (.docx)</Button>
    </Space>
  );

  const handleFileChange = (event) => {
    const f = event.target.files?.[0] || null;
    if (f && f.size > MAX_FILE_BYTES) {
      message.error(`Tệp vượt quá giới hạn 10 MB (tệp hiện tại: ${(f.size / 1024 / 1024).toFixed(1)} MB)`);
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(f);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title="Hồ sơ học sinh"
        extra={canManage && <Button type="primary" onClick={() => setOpen(true)}>Tải lên hồ sơ</Button>}
      >
        {canManage && (
          <Space wrap style={{ marginBottom: 16 }}>
            <Select
              showSearch
              placeholder="Chọn học sinh để xuất học bạ"
              value={selectedStudent || undefined}
              onChange={setSelectedStudent}
              options={students.map(s => ({ value: s._id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))}
              style={{ minWidth: 280 }}
            />
            {certButtons(certificateStudentId)}
          </Space>
        )}
        {!canManage && certificateStudentId && (
          <Typography.Paragraph>Xuất học bạ: {certButtons(certificateStudentId)}</Typography.Paragraph>
        )}
        <Table
          rowKey="_id"
          dataSource={rows}
          columns={[
            { title: 'Học sinh', render: (_, row) => row.studentId?.name || row.studentId?.code || 'Học sinh' },
            { title: 'Loại hồ sơ', dataIndex: 'documentType', render: value => <Tag>{TYPE_LABELS[value] || value}</Tag> },
            { title: 'Tiêu đề', dataIndex: 'title' },
            {
              title: 'Tệp',
              render: (_, row) => (
                <Space size="small">
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewDocument(row)}
                  >
                    Xem
                  </Button>
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadStudentDocumentApi(row._id, row.fileAssetId?.originalName || row.title).catch(e => message.error(e.message))}
                  >
                    Tải
                  </Button>
                </Space>
              ),
            },
            { title: 'Người tải lên', render: (_, row) => row.uploadedBy?.name || '—' },
            !canManage && personalStudents.length > 1
              ? { title: 'Học bạ', render: (_, row) => certButtons(row.studentId?._id || row.studentId) }
              : {},
          ].filter(column => column.title)}
        />
      </Card>
      {certificateStudentId && (
        <Card title="Lịch sử học bạ">
          <Table
            rowKey="_id"
            dataSource={history}
            locale={{ emptyText: 'Chưa có phiên bản học bạ đã lưu' }}
            columns={[
              { title: 'Phiên bản', dataIndex: 'version', render: value => `Phiên bản ${value}` },
              { title: 'Ngày lưu', dataIndex: 'createdAt', render: value => dayjs(value).format('DD/MM/YYYY HH:mm') },
              { title: 'Người tạo', render: (_, row) => row.createdBy?.name || '—' },
              {
                title: 'Tải bản đã lưu',
                render: (_, row) => (
                  <Space>
                    <Button size="small" onClick={() => downloadTranscriptSnapshotApi(certificateStudentId, row._id, row.version, 'pdf').catch(error => message.error(error.message))}>
                      PDF v{row.version}
                    </Button>
                    <Button size="small" onClick={() => downloadTranscriptSnapshotApi(certificateStudentId, row._id, row.version, 'docx').catch(error => message.error(error.message))}>
                      Word v{row.version}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}
      <DocumentUploadModal open={open} setOpen={setOpen} saving={saving} setSaving={setSaving} form={form} file={file} setFile={setFile} load={load} students={students} handleFileChange={handleFileChange} TYPE_LABELS={TYPE_LABELS} />
      <FilePreviewModal {...preview} onClose={closePreview} />
    </Space>
  );
};

export default StudentDocumentsPage;
