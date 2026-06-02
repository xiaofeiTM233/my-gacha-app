'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Tag,
  Spin,
  Empty,
  Typography,
  Card,
  Statistic,
  Tabs,
  message,
} from 'antd';
import {
  ReloadOutlined,
} from '@ant-design/icons';
import { MRRow, CharAvatar, type IMRItem } from '@/components/DrawBar';
import drawStyles from '@/components/DrawBar.module.css';
import pageStyles from './stats.module.css';

const { Text } = Typography;

// ====== 类型定义 ======
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

// ====== 通用统计卡片 ======
interface IStatCardProps {
  title: string;
  value: number;
  suffix: string;
  color: string;
}

const cardBodyStyle = { padding: '12px 0', textAlign: 'center' as const };

function StatCard({ title, value, suffix, color }: IStatCardProps) {
  return (
    <Card variant="borderless" styles={{ body: cardBodyStyle }}>
      <Statistic
        title={title}
        value={value}
        suffix={<span className={pageStyles.statSuffix}>{suffix}</span>}
        styles={{ content: { color, fontWeight: 700 } }}
      />
    </Card>
  );
}

// ====== 统计卡片组 ======
function PoolStats({ pool }: { pool: IPoolDetail }) {
  const items = pool.mRItems;
  const totalCount = pool.draws;
  const dropCount = items.length;
  const upCount = items.filter((i) => i.isUp).length;
  const dropRate = totalCount > 0 ? ((dropCount / totalCount) * 100).toFixed(1) : '0';
  const upRate = dropCount > 0 ? ((upCount / dropCount) * 100).toFixed(1) : '0';
  const avgDraws = dropCount > 0 ? (totalCount / dropCount).toFixed(1) : '-';

  return (
    <div className={pageStyles.statsGrid}>
      <StatCard title="出货个数" value={dropCount} suffix={`(${dropRate}%)`} color="#10b981" />
      <StatCard title="UP个数" value={upCount} suffix={`(${upRate}%)`} color="#f59e0b" />
      <StatCard title="抽卡总数" value={totalCount} suffix={`(均${avgDraws}抽)`} color="#3b82f6" />
    </div>
  );
}

// 卡池详情区块
function PoolSection({ pool }: { pool: IPoolDetail }) {
  const items = pool.mRItems;
  const hasItems = items.length > 0;

  // 按 ts 分组，再按时间排序
  const groups: IMRItem[][] = !hasItems ? [] :
    Array.from(
      items.reduce((map, item) => {
        const key = String(item.ts);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
        return map;
      }, new Map<string, IMRItem[]>())
      .values()
    ).sort((a, b) => a[0].ts - b[0].ts);

  const upChars = Array.from(new Set(items.filter((i) => i.isUp).map((i) => i.charName)));

  return (
    <div>
      {/* 卡池头部 */}
      <div className={pageStyles.poolHeader}>
        <div className={pageStyles.poolHeaderLeft}>
          <div className={pageStyles.poolTitle} style={{ fontSize: 20, fontWeight: 600 }}>{pool.name}</div>
          <Text className={pageStyles.poolDate}>{pool.startDate || '?'}-{pool.endDate || '?'}</Text>
        </div>
        <Tag
          color="blue"
          variant='solid'
          style={{
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
          <div className={pageStyles.upList}>
            {upChars.map((name) => (
              <CharAvatar key={name} name={name} game={pool.game} size={24} />
            ))}
          </div>

          {/* 出金记录列表 */}
          {groups.map((group, groupIdx) => {
            const isMultiGold = group.length > 1;
            return (
              <div key={groupIdx} className={`${drawStyles.mrGroup} ${isMultiGold ? drawStyles.mrGold : ''}`}>
                {isMultiGold ? (
                  /* 多货：高亮容器 */
                  <>
                    <Tag
                      color="#10b981"
                      variant="solid"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '2px 6px',
                        marginTop: 5,
                      }}
                    >
                      欧皇附体
                    </Tag>
                    {group.map((item, idx) => (
                      <MRRow key={`${item.charId}-${idx}`} item={item} game={pool.game} />
                    ))}
                  </>
                ) : (
                  /* 单货：正常渲染 */
                  group.map((item, idx) => (
                    <MRRow key={`${item.charId}-${idx}`} item={item} game={pool.game} />
                  ))
                )}
              </div>
            );
          })}
        </>
      ) : (
        <Text type="secondary" className={pageStyles.noItems}>暂无出货记录</Text>
      )}
    </div>
  );
}

// ====== 主页面 ======
export default function StatsPage() {
  const [stats, setStats] = useState<IStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  // 初始加载（effect 内不调用 setState，避免 react-compiler 警告）
  // loading 已由 useState(true) 初始化，只需在完成/失败时更新
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/gacha/stats');
        const json: IApiResponse = await res.json();
        if (cancelled) return;
        if (json.code === 0 && json.data) {
          setStats(json.data);
          setError(null);
          if (json.data.pools.length > 0) {
            setActiveTab(json.data.pools[0].id);
          }
        } else {
          setError(json.msg || '获取数据失败');
          message.error(json.msg || '获取数据失败');
        }
      } catch {
        if (cancelled) return;
        setError('网络请求失败');
        message.error('网络请求失败');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 手动刷新
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
    } catch {
      setError('网络请求失败');
      message.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 当前选中的卡池
  const activePool = stats?.pools.find((p) => p.id === activeTab);

  // 构建 Tabs
  const tabItems = stats?.pools.map((pool) => ({
    key: pool.id,
    label: (
      <div className={pageStyles.tabLabel}>
        <span>{pool.name}</span>
        <span className={pageStyles.tabDate}>{pool.startDate}</span>
      </div>
    ),
    children: null,
  })) || [];

  return (
    <div className={pageStyles.pageWrapper}>
      {/* 页面标题栏 */}
      <div className={pageStyles.pageHeader}>
        <span className={pageStyles.pageTitle}>抽卡统计</span>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={loading} />}
          onClick={fetchStats}
          disabled={loading}
          className={pageStyles.reloadBtn}
        />
      </div>

      {/* 加载状态 */}
      {loading && !stats && (
        <div className={pageStyles.centerBlock}>
          <Spin size="large" />
          <Text type="secondary">加载中...</Text>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className={pageStyles.centerBlock}>
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
          {/* 统计卡片 */}
          {activePool && <PoolStats pool={activePool} />}
          {/* 卡池详情 */}
          {activePool && <PoolSection pool={activePool} />}
        </>
      )}

      {/* 空状态 */}
      {stats && stats.pools.length === 0 && (
        <div className={pageStyles.centerBlockTight}>
          <Empty description={<span>暂无抽卡数据<br /><span className={pageStyles.emptySubtext}>请先导入抽卡记录</span></span>} />
        </div>
      )}
    </div>
  );
}
