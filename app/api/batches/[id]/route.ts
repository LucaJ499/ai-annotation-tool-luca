import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// 获取批次详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        samples: {
          orderBy: { sequence: 'asc' },
          include: {
            annotation: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    // 统计每个标注人的进度
    const annotatorProgress: Record<string, { total: number; completed: number }> = {};
    const annotators = JSON.parse(batch.annotators);

    annotators.forEach((name: string) => {
      annotatorProgress[name] = { total: 0, completed: 0 };
    });

    batch.samples.forEach((sample) => {
      if (annotatorProgress[sample.assignedTo]) {
        annotatorProgress[sample.assignedTo].total++;
        if (sample.status === 'annotated') {
          annotatorProgress[sample.assignedTo].completed++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        annotators,
        annotatorProgress,
      },
    });
  } catch (error) {
    console.error('获取批次详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取批次详情失败' },
      { status: 500 }
    );
  }
}

// 删除批次
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    await prisma.batch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '批次已删除',
    });
  } catch (error) {
    console.error('删除批次失败:', error);
    return NextResponse.json(
      { success: false, error: '删除批次失败' },
      { status: 500 }
    );
  }
}
