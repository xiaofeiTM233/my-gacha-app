'use client';

import { Tag, Avatar, Typography } from 'antd';
import styles from './DrawBar.module.css';

const { Text } = Typography;

// ====== 类型定义 ======
export interface IMRItem {
  charId: string;
  charName: string;
  draws: number;
  isUp: boolean;
  ts: number;        // 该记录的时间戳（同一十连的记录共享相同值，用于分组）
}

// ====== 颜色工具函数 ======
// 10以内超欧 | ≤35绿 | 36~55黄 | 56~100红 | >100深红

export function getBarColor(draws: number): string {
  if (draws > 100) return '#991b1b';
  if (draws <= 35) return '#10b981';
  if (draws <= 55) return '#ecc867';
  return '#ef4444';
}

export function getBarBgColor(draws: number): string {
  if (draws > 100) return '#7f1d1d4d';
  if (draws <= 35) return '#064e3b40';
  if (draws <= 55) return '#713f1233';
  return '#7f1d1d33';
}

// 头像背景色池
const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#e11d48', '#0891b2', '#db2777', '#4f46e5',
];
// 图片头像底色
const AVATAR_IMG_BG = '#d4d4d8';

// 各游戏头像 URL
const AVATAR_URLS = {
  A: (name: string) => `https://prts.wiki/w/Special:Redirect/file/头像_${name}.png`,
  EC: (name: string) => `https://wiki.biligame.com/zmd/Special:Redirect/file/${name}头像.png`,
  EW: (name: string) => `https://wiki.biligame.com/zmd/Special:Redirect/file/${name}图标.png`,
};

// ====== 角色头像 ======
export function CharAvatar({ name, isOffPity, game, size = 36 }: {
  name: string;
  isOffPity?: boolean;
  game?: string;
  size?: number;
}) {
  const bgColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const avatarUrl = game && AVATAR_URLS[game as keyof typeof AVATAR_URLS]?.(name);

  return (
    <div className={styles.charAvatar}>
      <Avatar
        size={size}
        shape="square"
        src={avatarUrl}
        className={avatarUrl ? styles.avatarImg : styles.avatarText}
        style={avatarUrl
          ? { backgroundColor: AVATAR_IMG_BG }
          : { backgroundColor: bgColor }}
      >
        {!avatarUrl && name.charAt(0)}
      </Avatar>
      {isOffPity && <span className={styles.offPityBadge}>歪</span>}
    </div>
  );
}

// ====== 抽数进度条 ======
export function DrawBar({ draws }: { draws: number }) {
  const barColor = getBarColor(draws);
  const barBg = getBarBgColor(draws);

  return (
    <div className={styles.drawBar} style={{ backgroundColor: barBg }}>
      <div className={styles.drawBarFill} style={{ backgroundColor: barColor }}>
        <div className={styles.drawBarStripes} />
      </div>
      <Text strong className={styles.drawBarText}>
        <span className={styles.drawBarNum}>{draws}</span>抽
      </Text>
    </div>
  );
}

// ====== 出货记录条目 ======
export function MRRow({ item, game, size = 36 }: { item: IMRItem; game?: string; size?: number }) {
  const barWidth = `${Math.min(80, Math.max(25, (item.draws / 100) * 100))}%`;

  return (
    <div className={styles.mrRow}>
      <CharAvatar name={item.charName} isOffPity={!item.isUp} game={game} size={size} />
      <div className={styles.mrRowBar} style={{ width: barWidth }}>
        <DrawBar draws={item.draws} />
        {item.draws <= 10 && (
          <Tag
            color="#10b981"
            variant="solid"
            style={{
              fontWeight: 700,
            }}
          >
            超欧
          </Tag>
        )}
    </div>
    </div >
  );
}
