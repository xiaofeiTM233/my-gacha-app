import mongoose, { Schema, Model, Document } from 'mongoose';

// 抽卡结果子文档接口
export interface IResult {
  id: string;   // 角色id
  name: string; // 角色名称
}

// 抽卡记录数据模型接口
export interface IHistory extends Document {
  poolId: string;       // 卡池id
  id: string;           // 排序id (时间&位置)
  result: IResult;      // 抽卡结果
  rarity: number;       // 稀有度
  new: boolean;         // 是否为新
  pity: boolean;        // 是否为保底
  ts: number;           // 时间
  pos: number;          // 位置
}

// 抽卡记录Schema
const HistorySchema = new Schema<IHistory>(
  {
    poolId: {
      type: String,
      required: true,
      trim: true,
    },
    id: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      id: {
        type: String,
        required: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    rarity: {
      type: Number,
      required: true,
    },
    new: {
      type: Boolean,
      required: true,
    },
    pity: {
      type: Boolean,
      required: true,
    },
    ts: {
      type: Number,
      required: true,
    },
    pos: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,  // 不自动添加时间戳
    versionKey: false, // 不添加 __v 字段
    collection: 'history',
  }
);

// 导出模型
const History: Model<IHistory> = mongoose.models.History || mongoose.model<IHistory>('History', HistorySchema);

export default History;
