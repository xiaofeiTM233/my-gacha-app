'use client';

import { Typography, Card, Row, Col, Statistic } from 'antd';
import {
  DatabaseOutlined,
  BarChartOutlined,
  ImportOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function Home() {
  const router = useRouter();

  const cards = [
    {
      title: '抽卡统计',
      desc: '查看抽卡出货记录，分析运气与概率',
      icon: <BarChartOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      path: '/stats',
      color: '#52c41a',
    },
    {
      title: '卡池管理',
      desc: '管理所有卡池数据，新增、编辑、删除卡池信息',
      icon: <DatabaseOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
      path: '/pools',
      color: '#1677ff',
    },
    {
      title: '数据导入',
      desc: '导入抽卡历史数据，支持 JSON 导入和 Token 自动获取',
      icon: <ImportOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      path: '/import',
      color: '#722ed1',
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8 }} />
          Gacha App
        </Title>
        <Text type="secondary">抽卡记录与统计分析工具</Text>
      </div>

      <Row gutter={[24, 24]}>
        {cards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.path}>
            <Card
              hoverable
              onClick={() => router.push(card.path)}
              style={{
                cursor: 'pointer',
                borderColor: '#303030',
              }}
              styles={{
                body: { padding: 24 },
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <Title level={4} style={{ marginBottom: 4 }}>
                    {card.title}
                  </Title>
                  <Text type="secondary">{card.desc}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
