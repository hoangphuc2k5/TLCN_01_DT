import { useEffect, useState } from 'react';
import { Button, Input, Space, Table, Tag, message } from 'antd';
import { getAdmissionsApi, reviewAdmissionApi } from '../../api';

const AdmissionsPage = () => {
  const [rows, setRows] = useState([]); const load = async () => { const r = await getAdmissionsApi(); if (r?.EC === 0) setRows(r.data || []); };
  useEffect(() => { load(); }, []);
  const review = async (row, status) => { const note = window.prompt('Ghi chu ket qua', ''); const r = await reviewAdmissionApi(row._id, { status, reviewNote: note || '' }); if (r?.EC === 0) load(); else message.error(r?.EM); };
  return <div><Space style={{ marginBottom: 16 }}><Input.Search placeholder="Loc status" onSearch={value => getAdmissionsApi(value ? { status: value.toUpperCase() } : undefined).then(r => r?.EC === 0 && setRows(r.data || []))} /></Space><Table rowKey="_id" dataSource={rows} columns={[{ title: 'Ma ho so', dataIndex: 'trackingCode' }, { title: 'Hoc sinh', dataIndex: 'applicantName' }, { title: 'Khoi', dataIndex: 'requestedGrade' }, { title: 'Trang thai', dataIndex: 'status', render: v => <Tag>{v}</Tag> }, { title: 'Thao tac', render: (_, r) => <Space>{r.status === 'SUBMITTED' && <Button size="small" onClick={() => review(r, 'UNDER_REVIEW')}>Tiep nhan</Button>}{['SUBMITTED', 'UNDER_REVIEW'].includes(r.status) && <><Button size="small" onClick={() => review(r, 'ACCEPTED')}>Nhan hoc</Button><Button size="small" danger onClick={() => review(r, 'REJECTED')}>Tu choi</Button></>}</Space> }]} /></div>;
};
export default AdmissionsPage;
