'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Avatar,
  Tag,
  Spin,
  Empty,
  Typography,
  Divider,
  Card,
  Statistic,
  Tabs,
  message,
} from 'antd';
import {
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ====== 类型定义 ======
interface IMRItem {
  charId: string;
  charName: string;
  draws: number;
  isUp: boolean;
}

interface IPoolDetail {
  id: string;
  name: string;
  game: string;
  startDate: string;
  endDate: string;
  draws: number;
  mRItems: IMRItem[];
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

function getBarColor(draws: number): string {
  if (draws > 100) return '#991b1b';
  if (draws <= 55) return '#10b981';
  return '#ef4444';
}

function getBarBgColor(draws: number): string {
  if (draws > 100) return '#7f1d1d4d';
  if (draws <= 55) return '#064e3b40';
  return '#7f1d1d33';
}

// 头像背景色池
const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#e11d48', '#0891b2', '#db2777', '#4f46e5',
];
// 图片头像底色
const AVATAR_IMG_BG = '#d4d4d8';

// ====== 子组件 ======

// 角色头像（根据游戏类型决定用图片还是文字 + 内嵌歪角标）
function CharAvatar({ name, isOffPity, game, size = 36 }: { name: string; isOffPity?: boolean; game?: string; size?: number }) {
  const bgColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const avatarUrl = game === 'A' ? `https://prts.wiki/w/Special:Redirect/file/头像_${name}.png` : undefined;

  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <Avatar
        size={size}
        shape="square"
        src={avatarUrl}
        style={game === 'A' ? { objectFit: 'cover', backgroundColor: AVATAR_IMG_BG, border: 'none' } : { backgroundColor: bgColor, fontWeight: 700, border: 'none' }}
      >
        {game !== 'A' && name.charAt(0)}
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
function DrawBar({ draws }: { draws: number }) {
  const barColor = getBarColor(draws);
  const barBg = getBarBgColor(draws);

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
        {draws} 抽
      </Text>
    </div>
  );
}

// mRarity稀有度出金记录条目
function MRRow({ item, game }: { item: IMRItem; game?: string }) {
  const barWidth = `${Math.min(80, Math.max(25, (item.draws / 100) * 100))}%`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
      <CharAvatar name={item.charName} isOffPity={!item.isUp} game={game} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: barWidth }}>
        <DrawBar draws={item.draws} />
        {/* 超欧标签：展示在右边 */}
        {item.draws <= 10 && (
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

// 统计卡片组件
function PoolStats({ pool }: { pool: IPoolDetail }) {
  const items = pool.mRItems;
  const totalCount = pool.draws;
  const dropCount = items.length;
  const upCount = items.filter((i) => i.isUp).length;
  const dropRate = totalCount > 0 ? ((dropCount / totalCount) * 100).toFixed(1) : '0';
  const upRate = dropCount > 0 ? ((upCount / dropCount) * 100).toFixed(1) : '0';
  const avgDraws = dropCount > 0 ? (totalCount / dropCount).toFixed(1) : '-';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      marginBottom: 16,
    }}>
      <Card variant="borderless" styles={{ body: { padding: '12px 0', textAlign: 'center' } }}>
        <Statistic
          title="出货个数"
          value={dropCount}
          suffix={<span style={{ color: '#71717a', fontSize: 14 }}>({dropRate}%)</span>}
          styles={{ content: { color: '#10b981', fontWeight: 700 } }}
        />
      </Card>
      <Card variant="borderless" styles={{ body: { padding: '12px 0', textAlign: 'center' } }}>
        <Statistic
          title="UP个数"
          value={upCount}
          suffix={<span style={{ color: '#71717a', fontSize: 14 }}>({upRate}%)</span>}
          styles={{ content: { color: '#f59e0b', fontWeight: 700 } }}
        />
      </Card>
      <Card variant="borderless" styles={{ body: { padding: '12px 0', textAlign: 'center' } }}>
        <Statistic
          title="抽卡总数"
          value={totalCount}
          suffix={<span style={{ color: '#71717a', fontSize: 14 }}>(均{avgDraws}抽)</span>}
          styles={{ content: { color: '#3b82f6', fontWeight: 700 } }}
        />
      </Card>
    </div>
  );
}

// 卡池详情区块
function PoolSection({ pool }: { pool: IPoolDetail }) {
  const items = pool.mRItems;
  const hasItems = items.length > 0;

  // 将items分组
  const groups: IMRItem[][] = [];
  if (hasItems) {
    for (let i = 0; i < items.length; i += 20) {
      groups.push(items.slice(i, i + 20));
    }
  }

  const upChars = Array.from(new Set(items.filter((i) => i.isUp).map((i) => i.charName)));

  return (
    <div>
      {/* 卡池头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>{pool.name}</Title>
          <Text style={{ color: '#a1a1aa' }}>{pool.startDate || '?'}-{pool.endDate || '?'}</Text>
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
          {pool.draws}抽
        </Tag>
      </div>

      {hasItems ? (
        <>
          {/* UP角色头像列表 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {upChars.map((name) => (
              <CharAvatar key={name} name={name} game={pool.game} size={24} />
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
                  <MRRow key={`${item.charId}-${idx}`} item={item} game={pool.game} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <Text type="secondary" style={{ padding: '8px 0', display: 'block' }}>暂无出货记录</Text>
      )}
    </div>
  );
}

// ====== 主页面 ======
export default function StatsPage() {
  const [stats, setStats] = useState<IStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gacha/stats');
      const json: IApiResponse = await res.json();
      if (json.code === 0 && json.data) {
        setStats(json.data);
        setError(null);
        // 默认选中第一个卡池
        if (json.data.pools.length > 0 && !activeTab) {
          setActiveTab(json.data.pools[0].id);
        }
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
  }, [activeTab]);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, [fetchStats]);

  // 等待客户端挂载后再渲染，避免无样式闪烁
  if (!mounted) {
    return (
      <div style={{ maxWidth: 512, margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          gap: 16,
        }}>
          <div style={{ color: '#52525b' }}>加载中...</div>
        </div>
      </div>
    );
  }

  // 当前选中的卡池
  const activePool = stats?.pools.find((p) => p.id === activeTab);

  // 构建 Tabs items（已按结束时间倒序，新的在前）
  const tabItems = stats?.pools.map((pool) => ({
    key: pool.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{pool.name}</span>
        <span style={{ color: '#71717a', fontSize: 12 }}>{pool.startDate}</span>
      </div>
    ),
    children: null, // 内容在外面渲染
  })) || [];

  return (
    <div style={{ maxWidth: 512, margin: '0 auto', width: '100%' }}>
      {/* 页面标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>抽卡统计</span>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={loading} />}
          onClick={fetchStats}
          disabled={loading}
          style={{ color: '#a1a1aa' }}
        />
      </div>

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

      {/* 卡池 Tab 切换 */}
      {stats && stats.pools.length > 0 && (
        <>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ color: '#fff' }}
          />
          {/* 统计卡片 - 在 Tab 下方，卡池名称上方 */}
          {activePool && <PoolStats pool={activePool} />}
          {/* 卡池详情 */}
          {activePool && <PoolSection pool={activePool} />}
        </>
      )}

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
    </div>
  );
}
