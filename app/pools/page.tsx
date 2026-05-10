'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Input, InputNumber, Button, message, Popconfirm, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';

interface IPool {
  _id?: string;
  id: string;
  name: string;
  type: string;
  game: string;
  up: string[];
  startTs: number;
  endTs: number;
  draws: number;
  draws10: number;
  rank: string;
  mRarity: number;
  upCount: number;
  mRCount: number;
}

interface DataType extends IPool {
  key: string;
}

export default function PoolsPage() {
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string>('');
  const [newRowKey, setNewRowKey] = useState<string>('');
  // 存储每行编辑中的临时数据
  const [editCache, setEditCache] = useState<Record<string, Partial<DataType>>>({});

  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pools');
      const json = await res.json();
      if (json.code === 0) {
        setDataSource(
          json.data.map((item: IPool) => ({ ...item, key: item.id || (item._id as string) }))
        );
      } else {
        message.error(json.msg || '获取卡池数据失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const isEditing = useCallback((record: DataType) => record.key === editingKey, [editingKey]);

  const edit = (record: DataType) => {
    // 缓存当前行的原始数据
    setEditCache((prev) => ({
      ...prev,
      [record.key]: { ...record },
    }));
    setEditingKey(record.key);
  };

  const cancel = () => {
    if (editingKey === newRowKey) {
      setDataSource((prev) => prev.filter((item) => item.key !== newRowKey));
      setNewRowKey('');
    }
    // 清除该行的编辑缓存
    setEditCache((prev) => {
      const next = { ...prev };
      delete next[editingKey];
      return next;
    });
    setEditingKey('');
  };

  const updateField = (key: string, field: keyof DataType, value: any) => {
    setEditCache((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const getEditedRow = (key: string): DataType | null => {
    const original = dataSource.find((item) => item.key === key);
    if (!original) return null;
    const edited = editCache[key];
    if (!edited) return original;
    // 合并原始数据和编辑数据
    let merged = { ...original, ...edited };
    // 如果是新增行，使用编辑缓存作为主要数据源
    if (key === newRowKey) {
      merged = edited as DataType;
      merged.key = key;
    }
    return merged;
  };

  const save = async (key: string) => {
    try {
      const row = getEditedRow(key);
      if (!row) {
        message.error('数据不存在');
        return;
      }
      // 基本校验
      if (!row.id) {
        message.error('卡池ID不能为空');
        return;
      }

      const isNew = key === newRowKey;
      setSaving(true);

      const url = '/api/pools';
      const method = isNew ? 'POST' : 'PUT';

      const { _id, key: _, ...body } = row;

      // 处理 up 字段
      if (typeof body.up === 'string') {
        body.up = (body.up as string)
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.code === 0) {
        message.success(isNew ? '创建成功' : '保存成功');
        setEditingKey('');
        setEditCache((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        if (isNew) setNewRowKey('');
        fetchPools();
      } else {
        message.error(json.msg || '操作失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pools?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 0) {
        message.success('删除成功');
        fetchPools();
      } else {
        message.error(json.msg || '删除失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleAdd = () => {
    const newKey = `new_${Date.now()}`;
    const newRow: DataType = {
      key: newKey,
      id: '',
      name: '',
      type: '',
      game: 'A',
      up: [],
      startTs: 0,
      endTs: 0,
      draws: 0,
      draws10: 0,
      rank: '',
      mRarity: 6,
      upCount: 0,
      mRCount: 0,
    };
    setDataSource([newRow, ...dataSource]);
    setEditCache((prev) => ({
      ...prev,
      [newKey]: { ...newRow },
    }));
    setNewRowKey(newKey);
    setEditingKey(newKey);
  };

  // 可编辑单元格组件
  const EditableCell = ({
    editing,
    dataIndex,
    inputType,
    record,
    children,
    ...restProps
  }: {
    editing: boolean;
    dataIndex: keyof DataType;
    inputType: 'number' | 'text' | 'tags';
    record: DataType;
    children: React.ReactNode;
    [key: string]: any;
  }) => {
    // 获取编辑缓存中的值或原始值
    const cachedValue = editCache[record.key]?.[dataIndex];
    const displayValue = editing ? cachedValue ?? record[dataIndex] : record[dataIndex];

    if (!editing) {
      if (dataIndex === 'up') {
        const val = record[dataIndex] as unknown as string[];
        return <td {...restProps}>{Array.isArray(val) ? val.map((v) => <Tag key={v}>{v}</Tag>) : null}</td>;
      }
      return <td {...restProps}>{children}</td>;
    }

    if (inputType === 'number') {
      return (
        <td {...restProps}>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={(displayValue as number) ?? 0}
            onChange={(val) => updateField(record.key, dataIndex, val)}
            size="small"
          />
        </td>
      );
    }

    if (inputType === 'tags') {
      const val = Array.isArray(displayValue) ? (displayValue as string[]).join(', ') : (displayValue as string) || '';
      return (
        <td {...restProps}>
          <Input
            size="small"
            value={val}
            placeholder="用逗号分隔多个UP角色"
            onChange={(e) => updateField(record.key, dataIndex, e.target.value)}
          />
        </td>
      );
    }

    return (
      <td {...restProps}>
        <Input
          size="small"
          value={(displayValue as string) || ''}
          onChange={(e) => updateField(record.key, dataIndex, e.target.value)}
        />
      </td>
    );
  };

  const columns: (ColumnsType<DataType>[number] & { editable?: boolean; inputType?: 'number' | 'text' | 'tags' })[] = [
    {
      title: '卡池ID',
      dataIndex: 'id',
      width: 160,
      editable: true,
      inputType: 'text',
      fixed: 'left',
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 200,
      editable: true,
      inputType: 'text',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      editable: true,
      inputType: 'text',
    },
    {
      title: '游戏',
      dataIndex: 'game',
      width: 80,
      editable: true,
      inputType: 'text',
    },
    {
      title: 'UP角色',
      dataIndex: 'up',
      width: 220,
      editable: true,
      inputType: 'tags',
    },
    {
      title: '开始时间戳',
      dataIndex: 'startTs',
      width: 140,
      editable: true,
      inputType: 'number',
    },
    {
      title: '结束时间戳',
      dataIndex: 'endTs',
      width: 140,
      editable: true,
      inputType: 'number',
    },
    {
      title: '抽数',
      dataIndex: 'draws',
      width: 80,
      editable: true,
      inputType: 'number',
    },
    {
      title: '十连数',
      dataIndex: 'draws10',
      width: 80,
      editable: true,
      inputType: 'number',
    },
    {
      title: '评级',
      dataIndex: 'rank',
      width: 80,
      editable: true,
      inputType: 'text',
    },
    {
      title: '最高稀有度',
      dataIndex: 'mRarity',
      width: 110,
      editable: true,
      inputType: 'number',
    },
    {
      title: 'UP数量',
      dataIndex: 'upCount',
      width: 90,
      editable: true,
      inputType: 'number',
    },
    {
      title: '最高稀有数量',
      dataIndex: 'mRCount',
      width: 120,
      editable: true,
      inputType: 'number',
    },
    {
      title: '操作',
      dataIndex: 'operation',
      width: 180,
      fixed: 'right',
      render: (_: any, record: DataType) => {
        const editable = isEditing(record);
        return editable ? (
          <Space size="small">
            <Button size="small" type="primary" onClick={() => save(record.key)} loading={saving} icon={<SaveOutlined />}>
              保存
            </Button>
            <Button size="small" onClick={cancel}>
              取消
            </Button>
          </Space>
        ) : (
          <Space size="small">
            <Button size="small" disabled={!!editingKey} onClick={() => edit(record)}>
              编辑
            </Button>
            <Popconfirm title="确定删除此卡池?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!(col as any).editable) return col;
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        editing: isEditing(record),
        dataIndex: (col as any).dataIndex as keyof DataType,
        inputType: (col as any).inputType || 'text',
      }),
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">卡池管理</h1>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPools} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={!!editingKey}>
              新增卡池
            </Button>
          </Space>
        </div>

        <Table<DataType>
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          dataSource={dataSource}
          columns={mergedColumns as ColumnsType<DataType>}
          loading={loading}
          rowClassName={(record) => (isEditing(record) ? 'editing-row' : '')}
          scroll={{ x: 1800, y: 'calc(100vh - 200px)' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          bordered
          size="small"
          rowKey="key"
        />

        <style jsx global>{`
          .editing-row td {
            padding: 4px 8px !important;
          }
          .ant-table-cell {
            vertical-align: middle !important;
          }
        `}</style>
      </div>
    </div>
  );
}
