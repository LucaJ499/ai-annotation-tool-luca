import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 保存标注结果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sampleId,
      batchId,
      annotator,
      isClearIntent,
      intentClassificationAccurate,
      hasKnowledge,
      knowledgeTitle,
      recallAccuracy,
      replyQuality,
      unavailableReasons,
      remark,
      actionSuggestionRelevant,
      guessQuestionsOk,
    } = body;

    if (!sampleId || !batchId || !annotator) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 使用事务保存标注结果并更新样本状态
    const result = await prisma.$transaction(async (tx) => {
      // 检查是否已有标注
      const existing = await tx.annotation.findUnique({
        where: { sampleId },
      });

      let annotation;
      if (existing) {
        // 更新
        annotation = await tx.annotation.update({
          where: { sampleId },
          data: {
            isClearIntent: isClearIntent || null,
            intentClassificationAccurate: intentClassificationAccurate || null,
            hasKnowledge: hasKnowledge || null,
            knowledgeTitle: knowledgeTitle || null,
            recallAccuracy: recallAccuracy || null,
            replyQuality: replyQuality || null,
            unavailableReasons: JSON.stringify(unavailableReasons || []),
            remark: remark || null,
            actionSuggestionRelevant: actionSuggestionRelevant || null,
            guessQuestionsOk: guessQuestionsOk || null,
            annotatedAt: new Date(),
          },
        });
      } else {
        // 创建
        annotation = await tx.annotation.create({
          data: {
            sampleId,
            batchId,
            annotator,
            isClearIntent: isClearIntent || null,
            intentClassificationAccurate: intentClassificationAccurate || null,
            hasKnowledge: hasKnowledge || null,
            knowledgeTitle: knowledgeTitle || null,
            recallAccuracy: recallAccuracy || null,
            replyQuality: replyQuality || null,
            unavailableReasons: JSON.stringify(unavailableReasons || []),
            remark: remark || null,
            actionSuggestionRelevant: actionSuggestionRelevant || null,
            guessQuestionsOk: guessQuestionsOk || null,
          },
        });
      }

      // 更新样本状态
      await tx.sample.update({
        where: { id: sampleId },
        data: { status: 'annotated' },
      });

      // 更新批次完成数
      const completedCount = await tx.annotation.count({
        where: { batchId },
      });

      await tx.batch.update({
        where: { id: batchId },
        data: { completedCount },
      });

      return annotation;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('保存标注失败:', error);
    return NextResponse.json(
      { success: false, error: '保存标注失败' },
      { status: 500 }
    );
  }
}
