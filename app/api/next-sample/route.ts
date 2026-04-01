import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取下一条待标注样本
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const annotator = searchParams.get('annotator');
    const currentSequence = searchParams.get('currentSequence');
    const direction = searchParams.get('direction') || 'next'; // next, prev

    if (!batchId || !annotator) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const currentSeq = currentSequence ? parseInt(currentSequence, 10) : 0;

    // 1. 提前获取进度信息
    const [totalCount, completedCount] = await Promise.all([
      prisma.sample.count({
        where: { batchId, assignedTo: annotator },
      }),
      prisma.sample.count({
        where: { batchId, assignedTo: annotator, status: 'annotated' },
      }),
    ]);

    let sample = null;
    let isAllCompleted = false;

    // 2. 判断是否为全量完成后的首次进入兜底场景
    if (currentSeq === 0 && direction === 'next' && totalCount > 0 && totalCount === completedCount) {
      // 兜底：获取最后一条已标注的样本
      sample = await prisma.sample.findFirst({
        where: {
          batchId,
          assignedTo: annotator,
          status: 'annotated',
        },
        orderBy: {
          sequence: 'desc',
        },
        include: {
          annotation: true,
        },
      });
      isAllCompleted = true;
    } else {
      // 3. 常规查询逻辑
      const where: any = {
        batchId,
        assignedTo: annotator,
      };

      if (direction === 'next') {
        where.sequence = { gt: currentSeq };
        // 如果是首次进入（未全量完成），过滤掉已标注的，自动跳转到第一条未标注样本
        if (currentSeq === 0) {
          where.status = { not: 'annotated' };
        }
      } else {
        where.sequence = { lt: currentSeq };
      }

      sample = await prisma.sample.findFirst({
        where,
        orderBy: {
          sequence: direction === 'next' ? 'asc' : 'desc',
        },
        include: {
          annotation: true,
        },
      });
    }

    if (!sample) {
      return NextResponse.json({
        success: true,
        data: null,
        message: direction === 'next' ? '已经是最后一条' : '已经是第一条',
      });
    }

    // 4. 获取当前样本在个人列表中的序号
    const currentAnnotatorSeq = await prisma.sample.count({
      where: { 
        batchId, 
        assignedTo: annotator,
        sequence: { lte: sample.sequence }
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sample,
        isAllCompleted,
        progress: {
          current: currentAnnotatorSeq,
          total: totalCount,
          completed: completedCount,
        },
      },
    });
  } catch (error) {
    console.error('获取样本失败:', error);
    return NextResponse.json(
      { success: false, error: '获取样本失败' },
      { status: 500 }
    );
  }
}
