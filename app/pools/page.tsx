'use client';

import { useState, useEffect, useCallback } from 'react';
import { App, Table, Input, InputNumber, Button, Popconfirm, Tag, Space } from 'antd';
import { CloseOutlined, PlusOutlined as PlusIcon } from '@ant-design/icons';
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
  const { message } = App.useApp();
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string>('');
  const [newRowKey, setNewRowKey] = useState<string>('');
  // 存储每行编辑中的临时数据
  const [editCache, setEditCache] = useState<Record<string, Partial<DataType>>>({});
  // 控制页面是否显示（等待样式加载）
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
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
    editing = false,
    dataIndex,
    inputType = 'text',
    record,
    children,
    ...restProps
  }: {
    editing?: boolean;
    dataIndex?: keyof DataType;
    inputType?: string;
    record?: DataType;
    children?: React.ReactNode;
    [key: string]: any;
  }) => {
    if (!record) return <td {...restProps}>{children}</td>;

    const di = dataIndex!;
    const cachedValue = editCache[record.key]?.[di];
    const displayValue = editing ? cachedValue ?? record[di] : record[di];

    // 非编辑模式
    if (!editing) {
      if (di === 'up') {
        const val = record[di] as unknown as string[];
        return <td {...restProps}>{Array.isArray(val) ? val.map((v) => <Tag key={v}>{v}</Tag>) : null}</td>;
      }
      return <td {...restProps}>{children}</td>;
    }

    // 编辑模式 - 用统一类型避免 TS 类型收窄警告
    const t = inputType as string;

    if (t === 'number') {
      return (
        <td {...restProps}>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={(displayValue as number) ?? 0}
            onChange={(val) => updateField(record.key, di, val)}
            size="small"
          />
        </td>
      );
    }

    if (t === 'tags') {
      const tags: string[] = (Array.isArray(displayValue) ? displayValue : []) as string[];
      const [inputVal, setInputVal] = useState('');
      const handleAdd = () => {
        const val = inputVal.trim();
        if (!val) return;
        updateField(record.key, di, [...tags, val]);
        setInputVal('');
      };
      return (
        <td {...restProps} style={{ ...restProps.style, verticalAlign: 'top' }}>
          <div className="flex flex-wrap gap-1 mb-1">
            {tags.map((tag, idx) => (
              <Tag
                key={idx}
                closable
                onClose={() => updateField(record.key, di, tags.filter((_, i) => i !== idx))}
                closeIcon={<CloseOutlined style={{ fontSize: 10 }} />}
                style={{ marginBottom: 2 }}
              >
                {tag}
              </Tag>
            ))}
          </div>
          <Input
            size="small"
            value={inputVal}
            placeholder="输入后按回车添加"
            onChange={(e) => setInputVal(e.target.value)}
            onPressEnter={handleAdd}
            suffix={<PlusIcon onClick={handleAdd} style={{ cursor: 'pointer', color: '#999', fontSize: 12 }} />}
          />
        </td>
      );
    }

    // 默认 text
    return (
      <td {...restProps}>
        <Input
          size="small"
          value={(displayValue as string) || ''}
          onChange={(e) => updateField(record.key, di, e.target.value)}
        />
      </td>
    );
  };

  const columns: (ColumnsType<DataType>[number] & { editable?: boolean; inputType?: 'number' | 'text' | 'tags' | 'select' })[] = [
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
      width: 140,
      editable: true,
      inputType: 'text',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 130,
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
      width: 160,
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

  // 等待客户端挂载后再渲染，避免无样式闪烁
  if (!mounted) {
    return (
      <div style={{ padding: 0 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)' }}>
            <div style={{ color: '#8c8c8c' }}>加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>卡池管理</h1>
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
          scroll={{ x: 1800, y: 'calc(100vh - 160px)' }}
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
