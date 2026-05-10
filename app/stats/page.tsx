'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Layout,
  Button,
  Avatar,
  Tag,
  Spin,
  Empty,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  ReloadOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// ====== 类型定义 ======
interface IHighRarityItem {
  charId: string;
  charName: string;
  pulls: number;
  isUp: boolean;
}

interface IPoolDetail {
  poolId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  totalPulls: number;
  highRarityItems: IHighRarityItem[];
  upList: string[];
}

interface IStatsData {
  pools: IPoolDetail[];
}

interface IApiResponse {
  code: number;
  data: IStatsData | null;
  msg: string;
}

// ====== 颜色工具函数 ======
// 10以内超欧 | ≤55绿 | 56~100红 | >100深红

function getBarColor(pulls: number): string {
  if (pulls > 100) return '#991b1b';
  if (pulls <= 55) return '#10b981';
  return '#ef4444';
}

function getBarBgColor(pulls: number): string {
  if (pulls > 100) return '#7f1d1d4d';
  if (pulls <= 55) return '#064e3b40';
  return '#7f1d1d33';
}

// 头像背景色池
const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#e11d48', '#0891b2', '#db2777', '#4f46e5',
];

// ====== 子组件 ======

// 角色头像（antd Avatar + 内嵌歪角标）
function CharAvatar({ name, isOffPity }: { name: string; isOffPity?: boolean }) {
  const bgColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <Avatar
        size={36}
        style={{ backgroundColor: bgColor, fontWeight: 700 }}
        shape="square"
      >
        {name.charAt(0)}
      </Avatar>
      {/* 歪角标记：内嵌在头像右上角 */}
      {isOffPity && (
        <span className="absolute top-0 right-0 px-[3px] py-[1px] bg-red-500 text-white text-[8px] font-bold leading-none rounded-bl-sm rounded-tr-sm">
          歪
        </span>
      )}
    </div>
  );
}

// 抽数进度条
function PullBar({ pulls }: { pulls: number }) {
  const barColor = getBarColor(pulls);
  const barBg = getBarBgColor(pulls);

  return (
    <div
      style={{
        flex: 1,
        height: 28,
        backgroundColor: barBg,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: barColor,
          borderRadius: 6,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 4px,
                #00000026 4px,
                #00000026 8px
              )
            `,
          }}
        />
      </div>
      <Text strong style={{ fontSize: 14, color: '#000', whiteSpace: 'nowrap', position: 'relative', zIndex: 1, paddingLeft: 5 }}>
        {pulls} 抽
      </Text>
    </div>
  );
}

// 高稀有度出金记录条目
function HighRarityRow({ item }: { item: IHighRarityItem }) {
  const barWidth = `${Math.min(80, Math.max(25, (item.pulls / 100) * 100))}%`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
      <CharAvatar name={item.charName} isOffPity={!item.isUp} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: barWidth }}>
        <PullBar pulls={item.pulls} />
        {/* 超欧标签：展示在右边 */}
        {item.pulls <= 10 && (
          <Tag
            color="#10b981"
            style={{
              background: '#10b981',
              borderColor: '#10b981',
              color: '#fff',
              fontWeight: 700,
            }}
          >超欧</Tag>
        )}
      </div>
    </div>
  );
}

// 卡池详情区块
function PoolSection({ pool }: { pool: IPoolDetail }) {
  const items = pool.highRarityItems;
  const hasItems = items.length > 0;

  // 将items分组
  const groups: IHighRarityItem[][] = [];
  if (hasItems) {
    for (let i = 0; i < items.length; i += 20) {
      groups.push(items.slice(i, i + 20));
    }
  }

  const uniqueChars = Array.from(new Set(items.map((i) => i.charName)));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 卡池头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>{pool.name}</Title>
          <Text type="secondary">{pool.startDate || '?'}-{pool.endDate || '?'}</Text>
        </div>
        <Tag
          color="#1677ff"
          style={{
            background: '#1677ff',
            borderColor: '#1677ff',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            padding: '2px 12px',
          }}
        >
          {pool.totalPulls}抽
        </Tag>
      </div>

      {hasItems ? (
        <>
          {/* 出金角色头像列表 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {uniqueChars.map((name) => (
              <CharAvatar key={name} name={name} />
            ))}
          </div>

          {/* 出金记录列表 */}
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: groups.length > 1 ? 16 : 0 }}>
              {groups.length > 1 && (
                <Text type="success" style={{ marginBottom: 8, display: 'block', fontWeight: 500 }}>
                  十连二金
                </Text>
              )}
              <div>
                {group.map((item, idx) => (
                  <HighRarityRow key={`${item.charId}-${idx}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <Text type="secondary" style={{ padding: '8px 0', display: 'block' }}>暂无出金记录</Text>
      )}

      <Divider style={{ borderColor: '#27272a', marginTop: 8 }} />
    </div>
  );
}

// ====== 主页面 ======
export default function StatsPage() {
  const [stats, setStats] = useState<IStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gacha/stats');
      const json: IApiResponse = await res.json();
      if (json.code === 0 && json.data) {
        setStats(json.data);
        setError(null);
      } else {
        setError(json.msg || '获取数据失败');
        message.error(json.msg || '获取数据失败');
      }
    } catch (err) {
      setError('网络请求失败');
      message.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#121214' }}>
      {/* 顶部导航栏 */}
      <Header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#121214f2',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #27272a',
        padding: '0 24px',
        height: 56,
        lineHeight: '56px',
        maxWidth: 512,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>抽卡统计</span>
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchStats}
            disabled={loading}
            style={{ color: '#a1a1aa' }}
          />
        </div>
      </Header>

      {/* 主内容区 */}
      <Content style={{ maxWidth: 512, margin: '0 auto', width: '100%', padding: '16px 24px' }}>
        {/* 加载状态 */}
        {loading && !stats && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: 16,
          }}>
            <Spin size="large" />
            <Text type="secondary">加载中...</Text>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: 16,
          }}>
            <Empty description={error}>
              <Button onClick={fetchStats}>重试</Button>
            </Empty>
          </div>
        )}

        {/* 卡池详情列表 */}
        {stats && stats.pools.map((pool) => (
          <PoolSection key={pool.poolId} pool={pool} />
        ))}

        {/* 空状态 */}
        {stats && stats.pools.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: 8,
          }}>
            <Empty description={<span>暂无抽卡数据<br /><span style={{ color: '#52525b', fontSize: 13 }}>请先导入抽卡记录</span></span>} />
          </div>
        )}
      </Content>
    </Layout>
  );
}
