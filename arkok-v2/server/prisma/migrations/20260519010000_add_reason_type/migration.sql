-- AlterTable: 新增 reason_type 可选字段，区分减分惩罚(DEDUCT)和积分兑换(EXCHANGE)
ALTER TABLE "task_records" ADD COLUMN "reason_type" TEXT;
