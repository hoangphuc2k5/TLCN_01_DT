import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { verifyVnpayReturnApi } from '../../api';

export default function VnpayReturnPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    verifyVnpayReturnApi(window.location.search).then(response => {
      if (!active) return;
      if (response?.EC === 0) setResult(response.data);
      else setError(response?.EM || 'Không xác minh được kết quả thanh toán');
    }).catch(() => active && setError('Không kết nối được máy chủ. Vui lòng kiểm tra lại.'));
    return () => { active = false; };
  }, [revision]);
  if (!result && !error) return <Spin style={{ display: 'block', margin: 80 }} />;
  const paid = result?.status === 'PAID';
  const failed = result?.status === 'FAILED' || result?.gatewayStatus === 'FAILED';
  return <Result
    status={error || failed ? 'error' : paid ? 'success' : 'info'}
    title={error || (paid ? 'Đã ghi nhận thanh toán' : failed ? 'Giao dịch không thành công' : 'Đang chờ xác nhận thanh toán')}
    subTitle={!error && `${result.orderId}${!paid && !failed ? ' — Nhà trường đang chờ xác nhận từ VNPay. Chưa cần thanh toán lại.' : ''}`}
    extra={[<Button key="refresh" onClick={() => setRevision(v => v + 1)}>Kiểm tra lại</Button>, <Link key="fees" to="/fees">Về học phí</Link>]}
  />;
}
