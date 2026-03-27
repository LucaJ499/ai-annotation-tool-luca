import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// 获取批次数据统计
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // 获取批次基本信息
    const batch = await prisma.batch.findUnique({
      where: { id },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    // 获取所有已标注的样本及其标注数据
    const annotatedSamples = await prisma.sample.findMany({
      where: {
        batchId: id,
        status: 'annotated',
        annotation: {
          isNot: null,
        },
      },
      include: {
        annotation: true,
      },
    });

    const totalSubmitted = annotatedSamples.length;

    // 统计分布数据
    const distributions = {
      clearIntent: { '是': 0, '否': 0 },
      intentAccurate: { '是': 0, '否': 0 },
      hasKnowledge: { '有': 0, '没有': 0 },
      replyQuality: { '完全可用': 0, '部分可用': 0, '完全不可用': 0 },
      actionRelevant: { '是': 0, '否': 0 },
      guessQuestionsOk: { '是': 0, '否': 0 },
    };

    annotatedSamples.forEach((sample) => {
      const anno = sample.annotation!;
      
      // 是否为意图清晰问题
      if (anno.isClearIntent && distributions.clearIntent.hasOwnProperty(anno.isClearIntent)) {
        distributions.clearIntent[anno.isClearIntent as keyof typeof distributions.clearIntent]++;
      }
      
      // 搬家意图分类是否准确
      if (anno.intentClassificationAccurate && distributions.intentAccurate.hasOwnProperty(anno.intentClassificationAccurate)) {
        distributions.intentAccurate[anno.intentClassificationAccurate as keyof typeof distributions.intentAccurate]++;
      }
      
      // 知识库内是否有知识
      if (anno.hasKnowledge && distributions.hasKnowledge.hasOwnProperty(anno.hasKnowledge)) {
        distributions.hasKnowledge[anno.hasKnowledge as keyof typeof distributions.hasKnowledge]++;
      }
      
      // AI回复质量分布
      if (anno.replyQuality && distributions.replyQuality.hasOwnProperty(anno.replyQuality)) {
        distributions.replyQuality[anno.replyQuality as keyof typeof distributions.replyQuality]++;
      }
      
      // 行动建议内容是否相关
      if (anno.actionSuggestionRelevant && distributions.actionRelevant.hasOwnProperty(anno.actionSuggestionRelevant)) {
        distributions.actionRelevant[anno.actionSuggestionRelevant as keyof typeof distributions.actionRelevant]++;
      }
      
      // 猜你想问至少不离谱
      if (anno.guessQuestionsOk && distributions.guessQuestionsOk.hasOwnProperty(anno.guessQuestionsOk)) {
        distributions.guessQuestionsOk[anno.guessQuestionsOk as keyof typeof distributions.guessQuestionsOk]++;
      }
    });

    if (totalSubmitted === 0) {
      return NextResponse.json({
        success: true,
        data: {
          batch: {
            id: batch.id,
            name: batch.name,
            totalCount: batch.totalCount,
            completedCount: batch.completedCount,
          },
          mainMetric: {
            aiReplyWeighted: { value: 0, numerator: 0, denominator: 0, noData: true },
            aiReplyBasic: { value: 0, numerator: 0, denominator: 0, noData: true },
          },
          processMetrics: {
            clearIntent: { value: 0, numerator: 0, denominator: 0, noData: true },
            intentAccurate: { value: 0, numerator: 0, denominator: 0, noData: true },
            knowledgeCoverage: { value: 0, numerator: 0, denominator: 0, noData: true },
            recallAccuracy: { value: 0, numerator: 0, denominator: 0, noData: true },
          },
          distributions,
        },
      });
    }

    // 过程指标1：意图清晰率
    const clearIntentNumerator = distributions.clearIntent['是'];
    const clearIntentValue = totalSubmitted > 0
      ? Math.round((clearIntentNumerator / totalSubmitted) * 100)
      : 0;

    // 过程指标2：搬家意图分类准确率
    const intentAccurateNumerator = distributions.intentAccurate['是'];
    const intentAccurateValue = totalSubmitted > 0
      ? Math.round((intentAccurateNumerator / totalSubmitted) * 100)
      : 0;

    // 过程指标3：知识覆盖率
    // 分母：搬家意图分类是否准确 = 是 且 input_expect_classfiy = 搬家问题
    const knowledgeCoverageDenominator = annotatedSamples.filter((s) => {
      return s.annotation?.intentClassificationAccurate === '是' && 
             s.inputExpectClassfiy === '搬家问题';
    });
    // 分子：在上述分母中，知识库内是否有知识 = 有
    const knowledgeCoverageNumerator = knowledgeCoverageDenominator.filter((s) => {
      return s.annotation?.hasKnowledge === '有';
    });
    const knowledgeCoverageValue = knowledgeCoverageDenominator.length > 0
      ? Math.round((knowledgeCoverageNumerator.length / knowledgeCoverageDenominator.length) * 100)
      : 0;

    // 过程指标4：知识召回准确率
    // 分母：指标3的分子（搬家问题 + 意图准确 + 有知识）
    const recallAccuracyDenominator = knowledgeCoverageNumerator;
    // 分子：知识召回是否准确 = 是
    const recallAccuracyNumerator = recallAccuracyDenominator.filter((s) => {
      return s.annotation?.recallAccuracy === '是';
    });
    const recallAccuracyValue = recallAccuracyDenominator.length > 0
      ? Math.round((recallAccuracyNumerator.length / recallAccuracyDenominator.length) * 100)
      : 0;

    // 主指标：AI回复可用率
    // 基础可用率 = (完全可用 + 部分可用) / 全量
    const fullyAvailable = distributions.replyQuality['完全可用'];
    const partiallyAvailable = distributions.replyQuality['部分可用'];
    const aiReplyBasicValue = totalSubmitted > 0
      ? Math.round(((fullyAvailable + partiallyAvailable) / totalSubmitted) * 100)
      : 0;

    // 加权可用率 = (完全可用 * 1 + 部分可用 * 0.5) / 全量
    const weightedNumerator = fullyAvailable * 1 + partiallyAvailable * 0.5;
    const aiReplyWeightedValue = totalSubmitted > 0
      ? Math.round((weightedNumerator / totalSubmitted) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: batch.id,
          name: batch.name,
          totalCount: batch.totalCount,
          completedCount: batch.completedCount,
        },
        mainMetric: {
          aiReplyWeighted: {
            value: aiReplyWeightedValue,
            numerator: weightedNumerator,
            denominator: totalSubmitted,
            noData: totalSubmitted === 0,
          },
          aiReplyBasic: {
            value: aiReplyBasicValue,
            numerator: fullyAvailable + partiallyAvailable,
            denominator: totalSubmitted,
            noData: totalSubmitted === 0,
          },
        },
        processMetrics: {
          clearIntent: {
            value: clearIntentValue,
            numerator: clearIntentNumerator,
            denominator: totalSubmitted,
            noData: totalSubmitted === 0,
          },
          intentAccurate: {
            value: intentAccurateValue,
            numerator: intentAccurateNumerator,
            denominator: totalSubmitted,
            noData: totalSubmitted === 0,
          },
          knowledgeCoverage: {
            value: knowledgeCoverageValue,
            numerator: knowledgeCoverageNumerator.length,
            denominator: knowledgeCoverageDenominator.length,
            noData: knowledgeCoverageDenominator.length === 0,
          },
          recallAccuracy: {
            value: recallAccuracyValue,
            numerator: recallAccuracyNumerator.length,
            denominator: recallAccuracyDenominator.length,
            noData: recallAccuracyDenominator.length === 0,
          },
        },
        distributions,
      },
    });
  } catch (error) {
    console.error('获取批次统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取批次统计失败' },
      { status: 500 }
    );
  }
}
