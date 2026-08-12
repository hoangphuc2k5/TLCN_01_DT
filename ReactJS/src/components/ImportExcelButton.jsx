import { Button, Modal, Space, Table, Typography, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { downloadImportTemplateApi, importExcelApi } from '../api';

/**
 * Nút tải mẫu + upload Excel import
 * @param {{ type: 'users'|'grades'|'fees'|'attendance', onDone?: () => void, label?: string }} props
 */
const ImportExcelButton = ({ type, onDone, label = 'Import Excel' }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplateApi(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mau-import-${type}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Không tải được file mẫu');
    }
  };

  const beforeUpload = async (file) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await importExcelApi(type, file);
      if (res?.EC === 0) {
        message.success(res.EM || 'Import xong');
        setResult(res.data);
        onDone?.();
      } else {
        message.error(res?.EM || 'Import thất bại');
      }
    } catch {
      message.error('Lỗi khi import file');
    } finally {
      setLoading(false);
    }
    return false;
  };

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        title={`Import Excel — ${type}`}
        onCancel={() => setOpen(false)}
        footer={null}
        width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Tải file mẫu, điền dữ liệu rồi tải lên (.xlsx). Hệ thống báo từng dòng lỗi nếu có.
          </Typography.Paragraph>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
              Tải file mẫu
            </Button>
            <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={beforeUpload}>
              <Button type="primary" loading={loading} icon={<UploadOutlined />}>
                Chọn file để import
              </Button>
            </Upload>
          </Space>
          {result && (
            <>
              <Typography.Text>
                Thành công: <b>{result.success}</b> — Lỗi: <b>{result.failed}</b>
              </Typography.Text>
              {!!result.errors?.length && (
                <Table
                  size="small"
                  pagination={{ pageSize: 5 }}
                  rowKey={(r) => `${r.line}-${r.message}`}
                  dataSource={result.errors}
                  columns={[
                    { title: 'Dòng', dataIndex: 'line', width: 80 },
                    { title: 'Lỗi', dataIndex: 'message' },
                  ]}
                />
              )}
            </>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default ImportExcelButton;
