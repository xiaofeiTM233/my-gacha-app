'use client';

import { useEffect, useState, useCallback } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin, Button } from 'antd';
import {
  DatabaseOutlined,
  BarChartOutlined,
  ImportOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  StarOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MRRow, type IMRItem } from '@/components/DrawBar';

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

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<IStatsData | null>(null);
  const [pools, setPools] = useState<IPool[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, poolsRes] = await Promise.all([
        fetch('/api/gacha/stats'),
        fetch('/api/pools'),
      ]);
      const statsJson = await statsRes.json();
      const poolsJson = await poolsRes.json();

      if (statsJson.code === 0 && statsJson.data) {
        setStats(statsJson.data);
      }
      if (poolsJson.code === 0 && poolsJson.data) {
        setPools(poolsJson.data);
      }
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ====== 计算汇总数据 ======
  const allPools = (stats?.pools || []).slice().sort((a, b) => b.id.localeCompare(a.id));
  const totalDraws = allPools.reduce((sum, p) => sum + p.draws, 0);
  const totalMRItems = allPools.reduce((sum, p) => sum + p.mRItems.length, 0);
  const totalUpItems = allPools.reduce((sum, p) => sum + p.mRItems.filter((i) => i.isUp).length, 0);
  const avgDrawsPerMR = totalMRItems > 0 ? (totalDraws / totalMRItems).toFixed(1) : '-';
  const totalPools = allPools.length;

  // 运气最好的卡池（平均出货抽数最低）
  const bestPool = [...allPools].sort((a, b) => {
    const avgA = a.mRItems.length > 0 ? a.draws / a.mRItems.length : Infinity;
    const avgB = b.mRItems.length > 0 ? b.draws / b.mRItems.length : Infinity;
    return avgA - avgB;
  })[0];

  // 运气最差的卡池
  const worstPool = [...allPools].sort((a, b) => {
    const avgA = a.mRItems.length > 0 ? a.draws / a.mRItems.length : 0;
    const avgB = b.mRItems.length > 0 ? b.draws / b.mRItems.length : 0;
    return avgB - avgA;
  })[0];

  // 最近出货列表（所有卡池的 mRItems 扁平化，按卡池时间排序，取最近10条）
  const recentDrops = allPools
    .flatMap((p) => p.mRItems.map((item) => ({ ...item, poolName: p.name, poolId: p.id, game: p.game })))
    .slice(-10)
    .reverse();

  return (
    <div style={{ padding: 0 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>仪表盘</h1>
      </div>

      {loading && !stats ? (
        <Spin size="large" style={{ display: 'flex', justifyContent: 'center' }} />
      ) : totalPools === 0 ? (
        /* 空状态 */
        <Card style={{ borderColor: '#303030', textAlign: 'center', padding: '60px 0' }}>
          <StarOutlined style={{ fontSize: 48, color: '#52525b', marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>暂无数据</div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            还没有导入任何抽卡记录，请先前往数据导入页面
          </Text>
          <Button type="primary" size="large" onClick={() => router.push('/import')}>
            <ImportOutlined /> 前往导入
          </Button>
        </Card>
      ) : (
        <>
          {/* ====== 概览统计卡片 ====== */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="卡池总数"
                  value={totalPools}
                  prefix={<DatabaseOutlined style={{ color: '#1677ff' }} />}
                  styles={{ content: { color: '#1677ff', fontWeight: 700 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="总抽数"
                  value={totalDraws}
                  prefix={<BarChartOutlined style={{ color: '#3b82f6' }} />}
                  styles={{ content: { color: '#3b82f6', fontWeight: 700 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="SSR 数量"
                  value={totalMRItems}
                  prefix={<TrophyOutlined style={{ color: '#f59e0b' }} />}
                  styles={{ content: { color: '#f59e0b', fontWeight: 700 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="UP 命中"
                  value={totalUpItems}
                  suffix={
                    <span style={{ fontSize: 14, color: '#71717a' }}>
                      / {totalMRItems > 0 ? ((totalUpItems / totalMRItems) * 100).toFixed(0) : 0}%
                    </span>
                  }
                  prefix={<StarOutlined style={{ color: '#10b981' }} />}
                  styles={{ content: { color: '#10b981', fontWeight: 700 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="均出 SSR"
                  value={avgDrawsPerMR}
                  suffix="抽"
                  prefix={<RiseOutlined style={{ color: '#a855f7' }} />}
                  styles={{ content: { color: '#a855f7', fontWeight: 700 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card variant="borderless" styles={{ body: { padding: '16px 20px' } }}>
                <Statistic
                  title="十连数"
                  value={pools.reduce((sum, p) => sum + (p.draws10 || 0), 0)}
                  prefix={<ThunderboltOutlined style={{ color: '#ec4899' }} />}
                  styles={{ content: { color: '#ec4899', fontWeight: 700 } }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            {/* ====== 最近出货 ====== */}
            <Col xs={24} lg={8}>
              <Card
                variant="borderless"
                title={<Text strong style={{ color: '#fff', fontSize: 18 }}>最近出货</Text>}
                styles={{ body: { height: 300, overflow: 'auto' } }}
              >
                {recentDrops.length === 0 ? (
                  <Text type="secondary">暂无出货记录</Text>
                ) : (
                  recentDrops.map((item, idx) => (
                    <MRRow key={`${item.charId}-${idx}`} item={item} game={item.game} size={32} />
                  ))
                )}
              </Card>
            </Col>

            {/* ====== 卡池运评 ====== */}
            <Col xs={24} lg={8}>
              <Card
                variant="borderless"
                title={<Text strong style={{ color: '#fff', fontSize: 18 }}>卡池运评</Text>}
                styles={{ body: { height: 300 } }}
              >
                {bestPool && bestPool.mRItems.length > 0 ? (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <RiseOutlined style={{ color: '#10b981', fontSize: 16 }} />
                        <Text strong style={{ color: '#10b981' }}>最欧</Text>
                      </div>
                      <Card
                        size="small"
                        style={{ background: '#10b98110', borderColor: '#10b98130' }}
                        hoverable
                        onClick={() => router.push('/stats')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text strong style={{ color: '#fff' }}>{bestPool.name}</Text>
                            <br />
                            <Text style={{ fontSize: 12, color: '#71717a' }}>
                              {bestPool.draws}抽 / {bestPool.mRItems.length} SSR
                            </Text>
                          </div>
                          <Statistic
                            value={bestPool.mRItems.length > 0 ? (bestPool.draws / bestPool.mRItems.length).toFixed(1) : '-'}
                            suffix="抽/SSR"
                            styles={{ content: { color: '#10b981', fontWeight: 700, fontSize: 18 } }}
                          />
                        </div>
                      </Card>
                    </div>
                    {worstPool && worstPool.id !== bestPool.id && worstPool.mRItems.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <FallOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                          <Text strong style={{ color: '#ef4444' }}>最非</Text>
                        </div>
                        <Card
                          size="small"
                          style={{ background: '#ef444410', borderColor: '#ef444430' }}
                          hoverable
                          onClick={() => router.push('/stats')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ color: '#fff' }}>{worstPool.name}</Text>
                              <br />
                              <Text style={{ fontSize: 12, color: '#71717a' }}>
                                {worstPool.draws}抽 / {worstPool.mRItems.length} SSR
                              </Text>
                            </div>
                            <Statistic
                              value={worstPool.mRItems.length > 0 ? (worstPool.draws / worstPool.mRItems.length).toFixed(1) : '-'}
                              suffix="抽/SSR"
                              styles={{ content: { color: '#ef4444', fontWeight: 700, fontSize: 18 } }}
                            />
                          </div>
                        </Card>
                      </div>
                    )}
                  </>
                ) : (
                  <Text type="secondary">暂无出货数据</Text>
                )}
              </Card>
            </Col>

            {/* ====== 快捷导航 ====== */}
            <Col xs={24} lg={8}>
              <Card
                variant="borderless"
                title={<Text strong style={{ color: '#fff', fontSize: 18 }}>快捷操作</Text>}
                styles={{ body: { height: 300 } }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Button
                    block
                    size="large"
                    style={{ height: 56, background: '#10b98115', borderColor: '#10b98130', fontSize: 15 }}
                    onClick={() => router.push('/stats')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>
                        <BarChartOutlined style={{ color: '#10b981', marginRight: 8 }} />
                        抽卡统计
                      </span>
                      <ArrowRightOutlined style={{ color: '#10b981' }} />
                    </div>
                  </Button>
                  <Button
                    block
                    size="large"
                    style={{ height: 56, background: '#1677ff15', borderColor: '#1677ff30', fontSize: 15 }}
                    onClick={() => router.push('/pools')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>
                        <DatabaseOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                        卡池管理
                      </span>
                      <ArrowRightOutlined style={{ color: '#1677ff' }} />
                    </div>
                  </Button>
                  <Button
                    block
                    size="large"
                    style={{ height: 56, background: '#722ed115', borderColor: '#722ed130', fontSize: 15 }}
                    onClick={() => router.push('/import')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>
                        <ImportOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                        数据导入
                      </span>
                      <ArrowRightOutlined style={{ color: '#722ed1' }} />
                    </div>
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
      </div>
    </div>
  );
}
