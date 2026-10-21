import { useEffect, useState } from 'react';
import { Button, Card, Modal, Space, Spin, Tag, Typography, Alert } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';

import { getFileType } from '../utils/file-preview.js';

const getFileIcon = (type) => {
  switch (type) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
    case 'image':
      return <FileImageOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
    case 'text':
      return <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />;
    case 'word':
      return <FileWordOutlined style={{ color: '#2b579a', fontSize: 20 }} />;
    case 'excel':
      return <FileExcelOutlined style={{ color: '#217346', fontSize: 20 }} />;
    default:
      return <FileUnknownOutlined style={{ color: '#8c8c8c', fontSize: 20 }} />;
  }
};

const FilePreviewModal = ({
  open,
  onClose,
  title,
  fileName,
  fileUrl,
  mimeType,
  loading = false,
  error = null,
  sizeBytes = null,
  onDownload = null,
}) => {
  const [textContent, setTextContent] = useState('');
  const [readingText, setReadingText] = useState(false);
  const fileType = getFileType(fileName, mimeType);

  useEffect(() => {
    if (open && fileType === 'text' && fileUrl) {
      setReadingText(true);
      fetch(fileUrl)
        .then((res) => res.text())
        .then((txt) => setTextContent(txt))
        .catch(() => setTextContent('Không thể đọc nội dung văn bản'))
        .finally(() => setReadingText(false));
    } else {
      setTextContent('');
    }
  }, [open, fileUrl, fileType]);

  const openInNewTab = () => {
    if (fileUrl) window.open(fileUrl, '_blank');
  };

  return (
    <Modal
      open={open}
      title={
        <Space align="center" style={{ width: '100%', overflow: 'hidden' }}>
          {getFileIcon(fileType)}
          <Typography.Text strong ellipsis style={{ maxWidth: 550 }}>
            {title || fileName || 'Xem trước tài liệu'}
          </Typography.Text>
          {sizeBytes ? (
            <Tag color="geekblue">{(sizeBytes / 1024).toFixed(1)} KB</Tag>
          ) : null}
        </Space>
      }
      width={1000}
      style={{ top: 24 }}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        fileUrl && (fileType === 'pdf' || fileType === 'image') ? (
          <Button key="fullscreen" icon={<FullscreenOutlined />} onClick={openInNewTab}>
            Mở toàn màn hình
          </Button>
        ) : null,
        onDownload ? (
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
            Tải file về máy
          </Button>
        ) : null,
      ]}
      onCancel={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" tip="Đang tải dữ liệu tệp..." />
        </div>
      ) : error ? (
        <Alert type="error" message="Lỗi hiển thị tệp" description={error} showIcon style={{ margin: '24px 0' }} />
      ) : !fileUrl ? (
        <Alert type="warning" message="Không có đường dẫn tệp để xem trước" showIcon style={{ margin: '24px 0' }} />
      ) : fileType === 'pdf' ? (
        <iframe
          src={fileUrl}
          title={fileName || 'PDF Preview'}
          style={{ width: '100%', height: '74vh', border: '1px solid #f0f0f0', borderRadius: 6 }}
        />
      ) : fileType === 'image' ? (
        <div
          style={{
            textAlign: 'center',
            maxHeight: '74vh',
            overflow: 'auto',
            background: '#fafafa',
            padding: 16,
            borderRadius: 6,
          }}
        >
          <img
            src={fileUrl}
            alt={fileName || 'Preview'}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
          />
        </div>
      ) : fileType === 'text' ? (
        <div style={{ maxHeight: '74vh', overflow: 'auto', background: '#f8f9fa', padding: 16, borderRadius: 6 }}>
          {readingText ? (
            <Spin tip="Đang đọc nội dung..." />
          ) : (
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {textContent}
            </pre>
          )}
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: '40px 0', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ marginBottom: 16 }}>{getFileIcon(fileType)}</div>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            {fileName || 'Tài liệu'}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto 20px auto' }}>
            Định dạng tệp này ({fileType.toUpperCase()}) không hỗ trợ hiển thị trực tiếp an toàn trên trình duyệt mà không thông qua dịch vụ đám mây bên thứ ba.
            Vui lòng tải tệp về máy để xem đầy đủ bằng ứng dụng văn phòng.
          </Typography.Paragraph>
          {onDownload ? (
            <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={onDownload}>
              Tải tệp về máy ngay
            </Button>
          ) : null}
        </Card>
      )}
    </Modal>
  );
};

export default FilePreviewModal;
