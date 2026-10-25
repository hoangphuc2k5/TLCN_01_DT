import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Popconfirm, Space, Table, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {  deleteMaterialApi,
  getClassesApi,
  getMaterialsApi,
  getSubjectsApi,  downloadFileAssetApi,
  fetchFileAssetBlobApi,
  getFileUsageApi,
  getMaterialDownloadsApi,
} from '../../services/api.service';
import { can } from '../../utils/permissions';
import { ROLES } from '../../constants/roles';
import MaterialsDialogs from './MaterialsDialogs';

const MaterialsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'materials', 'create');
  const canViewDownloads = can(user, 'materials', 'update');
  const canViewDownloadHistory = row => canViewDownloads && row.fileAssetId && (
    (row.uploadedBy?._id || row.uploadedBy) === user?._id
    || [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(user?.role)
  );
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('link');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [downloads, setDownloads] = useState({ open: false, loading: false, data: null });
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

  const handlePreviewMaterial = async (row) => {
    setPreview({
      open: true,
      loading: true,
      error: null,
      title: row.title,
      fileName: '',
      fileUrl: '',
      mimeType: '',
      sizeBytes: null,
      onDownload: () => downloadFileAssetApi(row.fileAssetId).catch(e => message.error(e.message)),
    });
    try {
      const res = await fetchFileAssetBlobApi(row.fileAssetId);
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
    const res = await getMaterialsApi();
    if (res?.EC === 0) setRows(res.data || []);
    if (canManage && user?.schoolId) {
      const storage = await getFileUsageApi();
      if (storage?.EC === 0) setUsage(storage.data);
    }
  }, [canManage, user?.schoolId]);

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, s] = await Promise.all([getClassesApi(), getSubjectsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (s?.EC === 0) setSubjects(s.data || []);
      }
      load();
    })();
  }, [canManage, load]);

  return (
    <div>
      {canManage && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Thêm học liệu
        </Button>
      )}
      {usage && <Typography.Paragraph type="secondary">Dung lượng trường: {(usage.usedBytes / 1024 ** 2).toFixed(2)} / {(usage.quotaBytes / 1024 ** 2).toFixed(2)} MB · Tối đa {(usage.maxFileBytes / 1024 ** 2).toFixed(0)} MB/file</Typography.Paragraph>}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title' },
          { title: 'Chủ đề', dataIndex: 'topic' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
          {
            title: 'Tài liệu',
            dataIndex: 'fileUrl',
            render: (v, r) =>
              r.fileAssetId ? (
                <Space size="small">
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewMaterial(r)}
                  >
                    Xem
                  </Button>
                  <Button
                    type="link"
                    aria-label="Tải file"
                    onClick={() => downloadFileAssetApi(r.fileAssetId).catch(e => message.error(e.message))}
                  >
                    Tải file
                  </Button>
                </Space>
              ) : v ? (
                <a href={v} target="_blank" rel="noreferrer">
                  Mở link
                </a>
              ) : (
                '—'
              ),
          },
          { title: 'Người đăng', render: (_, r) => r.uploadedBy?.name },
          canViewDownloads
            ? {
                title: 'Theo dõi',
                render: (_, r) => canViewDownloadHistory(r) && (
                  <Button size="small" onClick={async () => {
                    setDownloads({ open: true, loading: true, data: null });
                    try {
                      const res = await getMaterialDownloadsApi(r._id);
                      if (res?.EC === 0) setDownloads({ open: true, loading: false, data: res.data });
                      else {
                        message.error(res?.EM || 'Không tải được lịch sử');
                        setDownloads({ open: false, loading: false, data: null });
                      }
                    } catch (error) {
                      message.error(error.message || 'Không tải được lịch sử');
                      setDownloads({ open: false, loading: false, data: null });
                    }
                  }}>
                    Lượt tải
                  </Button>
                ),
              }
            : {},
          can(user, 'materials', 'delete')
            ? {
                title: 'Xóa',
                render: (_, r) => ((r.uploadedBy?._id || r.uploadedBy) === user?._id || ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) && (
                  <Popconfirm
                    title="Xóa học liệu?"
                    onConfirm={async () => {
                      const res = await deleteMaterialApi(r._id);
                      if (res?.EC === 0) {
                        message.success(res.EM);
                        load();
                      } else message.error(res?.EM);
                    }}
                  >
                    <Button size="small" danger>
                      Xóa
                    </Button>
                  </Popconfirm>
                ),
              }
            : {},
        ].filter((c) => c.title)}
      />
      <MaterialsDialogs downloads={downloads} setDownloads={setDownloads} open={open} setOpen={setOpen} saving={saving} setSaving={setSaving} form={form} source={source} setSource={setSource} file={file} setFile={setFile} usage={usage} load={load} subjects={subjects} classes={classes} preview={preview} closePreview={closePreview} />
    </div>
  );
};

export default MaterialsPage;
