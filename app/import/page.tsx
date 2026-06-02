'use client';

import { useState } from 'react';
import {
  App,
  Card,
  Select,
  Upload,
  Button,
  Input,
  Alert,
  Spin,
  Collapse,
} from 'antd';
import {
  UploadOutlined,
  KeyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

// 适配器配置
const adapters = [
  {
    value: 'AdapterA',
    label: 'Arknights',
    description: '支持导入明日方舟抽卡历史 JSON 数据，或通过 Token 自动获取',
  },
];

export default function ImportPage() {
  const { message } = App.useApp();
  const [selectedAdapter, setSelectedAdapter] = useState<string>('AdapterA');
  const [jsonData, setJsonData] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [jsonResult, setJsonResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tokenResult, setTokenResult] = useState<{ success: boolean; message: string } | null>(null);

  // 处理 JSON 文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonData(content);
      message.success(`文件 ${file.name} 已加载`);
    };
    reader.readAsText(file);
    return false;
  };

  // 处理 JSON 导入
  const handleJsonImport = async () => {
    if (!jsonData.trim()) {
      message.error('请输入或上传 JSON 数据');
      return;
    }

    setLoading(true);
    setJsonResult(null);

    try {
      const data = JSON.parse(jsonData);
      const response = await fetch('/api/gacha/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const res = await response.json();

      if (res.code === 0) {
        setJsonResult({ success: true, message: res.msg });
        message.success('导入成功');
      } else {
        setJsonResult({ success: false, message: res.msg });
        message.error(res.msg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'JSON 格式错误';
      setJsonResult({ success: false, message: errorMsg });
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 处理 Token 导入
  const handleTokenImport = async () => {
    if (!token.trim()) {
      message.error('请输入 Token');
      return;
    }

    setLoading(true);
    setTokenResult(null);

    try {
      const response = await fetch('/api/gacha/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, adapter: selectedAdapter }),
      });

      const res = await response.json();

      if (res.code === 0) {
        setTokenResult({ success: true, message: res.msg });
        message.success('数据获取并导入成功');
      } else {
        setTokenResult({ success: false, message: res.msg });
        message.error(res.msg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '请求失败';
      setTokenResult({ success: false, message: errorMsg });
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const currentAdapter = adapters.find((a) => a.value === selectedAdapter);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>数据导入</h1>
        </div>

        <div style={{ display: 'flex', gap: 24, width: '100%' }}>
          {/* 左栏：适配器选择 + Token 导入 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 适配器选择 */}
            <Card>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>选择适配器</div>
              <Select
                value={selectedAdapter}
                onChange={setSelectedAdapter}
                style={{ width: '100%' }}
                options={adapters}
                size="middle"
              />
              {currentAdapter && (
                <Alert
                  title={currentAdapter.description}
                  type="info"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>

            {/* Token 导入 */}
            <Card style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>通过 Token 自动获取</div>

              <Alert
                title="Token 获取说明"
                description={
                  <div>
                    <div>1. 前往 <a href="https://web-api.hypergryph.com/account/info/hg" target="_blank" rel="noopener noreferrer">鹰角网络官网</a></div>
                    <div>2. 获取 Token</div>
                    <div>3. 粘贴到下方输入框</div>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="输入 Token..."
                prefix={<KeyOutlined />}
                size="middle"
                style={{ marginBottom: 16 }}
              />

              <Button
                type="primary"
                onClick={handleTokenImport}
                loading={loading}
                size="middle"
                block
              >
                获取并导入数据
              </Button>

              {tokenResult && (
                <Alert
                  title={tokenResult.success ? '导入成功' : '导入失败'}
                  description={tokenResult.message}
                  type={tokenResult.success ? 'success' : 'error'}
                  showIcon
                  icon={tokenResult.success ? <CheckCircleOutlined /> : undefined}
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          </div>

          {/* 右栏：JSON 导入 */}
          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>导入 JSON 数据</div>

            <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
              支持直接粘贴 JSON 数据或上传 JSON 文件
            </div>

            <Collapse
              ghost
              style={{ marginBottom: 16 }}
              items={[{
                key: '1',
                label: <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>示例数据格式</span>,
                children: (
                  <pre style={{
                    background: '#1a1a1a',
                    padding: 16,
                    borderRadius: 8,
                    overflow: 'auto',
                    fontSize: 12,
                    margin: 0,
                  }}>
                    <code>{`{
  "code": 0,
  "data": {
    "list": [
      {
        "poolId": "pool_001",
        "poolName": "限定卡池",
        "charId": "char_001",
        "charName": "能天使",
        "rarity": 6,
        "isNew": true,
        "gachaTs": "1714656890",
        "pos": 0
      }
    ],
    "hasMore": false
  },
  "msg": "success"
}`}</code>
                  </pre>
                ),
              }]}
            />

            <Upload
              accept=".json"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} style={{ marginBottom: 16 }}>
                上传 JSON 文件
              </Button>
            </Upload>

            <TextArea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="粘贴 JSON 数据..."
              rows={8}
              style={{ marginBottom: 16, fontFamily: 'monospace' }}
            />

            <Button
              type="primary"
              onClick={handleJsonImport}
              loading={loading}
              size="middle"
              block
            >
              导入数据
            </Button>

            {jsonResult && (
              <Alert
                title={jsonResult.success ? '导入成功' : '导入失败'}
                description={jsonResult.message}
                type={jsonResult.success ? 'success' : 'error'}
                showIcon
                icon={jsonResult.success ? <CheckCircleOutlined /> : undefined}
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </div>
      </div>

      <Spin spinning={loading} fullscreen />
    </div>
  );
}
