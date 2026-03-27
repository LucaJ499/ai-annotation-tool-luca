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

    // 构建查询条件
    const where: any = {
      batchId,
      assignedTo: annotator,
    };

    if (direction === 'next') {
      where.sequence = { gt: currentSeq };
    } else {
      where.sequence = { lt: currentSeq };
    }

    // 查询下一条/上一条
    const sample = await prisma.sample.findFirst({
      where,
      orderBy: {
        sequence: direction === 'next' ? 'asc' : 'desc',
      },
      include: {
        annotation: true,
      },
    });

    if (!sample) {
      return NextResponse.json({
        success: true,
        data: null,
        message: direction === 'next' ? '已经是最后一条' : '已经是第一条',
      });
    }

    // 获取该标注人的总样本数和已完成数
    const [totalCount, completedCount] = await Promise.all([
      prisma.sample.count({
        where: { batchId, assignedTo: annotator },
      }),
      prisma.sample.count({
        where: { batchId, assignedTo: annotator, status: 'annotated' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sample,
        progress: {
          current: sample.sequence,
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
