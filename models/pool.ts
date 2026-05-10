import mongoose, { Schema, Model, Document } from 'mongoose';

// 卡池数据模型接口
export interface IPool extends Document {
  type: string;           // 卡池类型
  game: string;           // 卡池游戏
  name: string;           // 卡池名称
  id: string;             // 卡池id
  startTs?: number;       // 开始时间戳
  endTs?: number;         // 结束时间戳
  draws?: number;         // 抽卡次数
  draws10?: number;       // 十连次数
  rank?: string;          // 运气评级
  up?: string[];          // 概率提升
  mRarity?: number;       // 最高稀有度（卡池本身）
  upCount?: number;       // 出了多少个up
  mRCount?: number;       // 出了多少个最高稀有度
  createdAt?: Date;       // 创建时间
  updatedAt?: Date;       // 更新时间
}

// 卡池Schema
const PoolSchema = new Schema<IPool>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    up: {
      type: [String],
      default: [],
    },
    startTs: {
      type: Number,
      default: 0,
      min: 0,
    },
    endTs: {
      type: Number,
      default: 0,
      min: 0,
    },
    draws: {
      type: Number,
      default: 0,
      min: 0,
    },
    draws10: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: String,
      trim: true,
    },
    mRarity: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    upCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    mRCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    game: {
      type: String,
      required: true,
      default: 'A',
      trim: true,
    },
  },
  {
    timestamps: false, // 不自动添加时间戳
    versionKey: false, // 不添加 __v 字段
    collection: 'pools',
  }
);

// 导出模型
const Pool: Model<IPool> = mongoose.models.Pool || mongoose.model<IPool>('Pool', PoolSchema);

export default Pool;
