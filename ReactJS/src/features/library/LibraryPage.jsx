import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Table, Tabs, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  borrowBookApi,
  createBookApi,
  getBooksApi,
  getLoansApi,
  getUsersApi,
  returnBookApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const LibraryPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = user?.role === ROLES.LIBRARIAN;
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [students, setStudents] = useState([]);
  const [openBook, setOpenBook] = useState(false);
  const [openLoan, setOpenLoan] = useState(false);
  const [bookForm] = Form.useForm();
  const [loanForm] = Form.useForm();

  const load = async () => {
    const [b, l] = await Promise.all([getBooksApi(), getLoansApi()]);
    if (b?.EC === 0) setBooks(b.data || []);
    if (l?.EC === 0) setLoans(l.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canManage) {
        const u = await getUsersApi({ role: ROLES.STUDENT });
        if (u?.EC === 0) setStudents(u.data || []);
      }
      load();
    })();
  }, []);

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'books',
            label: 'Đầu sách',
            children: (
              <>
                {canManage && (
                  <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpenBook(true)}>
                    Thêm sách
                  </Button>
                )}
                <Table
                  rowKey="_id"
                  dataSource={books}
                  columns={[
                    { title: 'Tên sách', dataIndex: 'title' },
                    { title: 'Tác giả', dataIndex: 'author' },
                    { title: 'ISBN', dataIndex: 'isbn' },
                    { title: 'Tổng', dataIndex: 'quantity' },
                    { title: 'Còn', dataIndex: 'available' },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'loans',
            label: 'Mượn / Trả',
            children: (
              <>
                {canManage && (
                  <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpenLoan(true)}>
                    Cho mượn
                  </Button>
                )}
                <Table
                  rowKey="_id"
                  dataSource={loans}
                  columns={[
                    { title: 'Sách', render: (_, r) => r.bookId?.title },
                    { title: 'Người mượn', render: (_, r) => r.borrowerId?.name },
                    {
                      title: 'Hạn trả',
                      dataIndex: 'dueAt',
                      render: (v) => dayjs(v).format('DD/MM/YYYY'),
                    },
                    {
                      title: 'TT',
                      dataIndex: 'status',
                      render: (v) => <Tag color={v === 'RETURNED' ? 'green' : 'blue'}>{v}</Tag>,
                    },
                    canManage
                      ? {
                          title: 'Thao tác',
                          render: (_, r) =>
                            r.status === 'BORROWED' ? (
                              <Button
                                size="small"
                                onClick={async () => {
                                  const res = await returnBookApi(r._id);
                                  if (res?.EC === 0) {
                                    message.success(res.EM);
                                    load();
                                  } else message.error(res?.EM);
                                }}
                              >
                                Trả sách
                              </Button>
                            ) : null,
                        }
                      : {},
                  ].filter((c) => c.title)}
                />
              </>
            ),
          },
        ]}
      />

      <Modal open={openBook} title="Thêm sách" onCancel={() => setOpenBook(false)} onOk={() => bookForm.submit()}>
        <Form
          form={bookForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createBookApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenBook(false);
              bookForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="title" label="Tên sách" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="author" label="Tác giả">
            <Input />
          </Form.Item>
          <Form.Item name="isbn" label="ISBN">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openLoan} title="Cho mượn sách" onCancel={() => setOpenLoan(false)} onOk={() => loanForm.submit()}>
        <Form
          form={loanForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await borrowBookApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenLoan(false);
              loanForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="bookId" label="Sách" rules={[{ required: true }]}>
            <Select
              options={books
                .filter((b) => b.available > 0)
                .map((b) => ({ value: b._id, label: `${b.title} (còn ${b.available})` }))}
            />
          </Form.Item>
          <Form.Item name="borrowerId" label="Học sinh" rules={[{ required: true }]}>
            <Select options={students.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="dueAt" label="Hạn trả" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LibraryPage;
