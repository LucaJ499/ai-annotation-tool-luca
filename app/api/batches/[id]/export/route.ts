import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FIELD_MAPPING } from '@/lib/constants';

interface Params {
  params: {
    id: string;
  };
}

// 导出批次标注结果
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        samples: {
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

    // 构建导出数据
    const exportData = batch.samples.map((sample) => {
      const annotation = sample.annotation;

      return {
        // 原始字段
        '__system_internal_id__': sample.systemInternalId || '',
        'input_input': sample.inputInput || '',
        'input_expect_classfiy': sample.inputExpectClassfiy || '',
        'input_step': sample.inputStep || '',
        'input_object': sample.inputObject || '',
        'input_status': sample.inputStatus || '',
        'output_actual_output': sample.outputActualOutput || '',
        'node_ZhiShangRAGRerank_zIOZ_output': sample.nodeZhiShangRAGRerank || '',
        'node_Script_uncA_output': sample.nodeScriptUncA || '',
        'node_Script_hBH1_output': sample.nodeScriptHbh1 || '',
        'node_Script_tezR_output': sample.nodeScriptTezR || '',
        'node_Script_oRFz_output': sample.nodeScriptORfz || '',

        // 标注字段
        'annotator': annotation?.annotator || '',
        'annotatedAt': annotation?.annotatedAt
          ? new Date(annotation.annotatedAt).toISOString()
          : '',
        'isClearIntent': annotation?.isClearIntent || '',
        'intentClassificationAccurate': annotation?.intentClassificationAccurate || '',
        'hasKnowledge': annotation?.hasKnowledge || '',
        'knowledgeTitle': annotation?.knowledgeTitle || '',
        'recallAccuracy': annotation?.recallAccuracy || '',
        'replyQuality': annotation?.replyQuality || '',
        'unavailableReasons': annotation?.unavailableReasons
          ? JSON.parse(annotation.unavailableReasons).join('; ')
          : '',
        'remark': annotation?.remark || '',
        'actionSuggestionRelevant': annotation?.actionSuggestionRelevant || '',
        'guessQuestionsOk': annotation?.guessQuestionsOk || '',
        'batchName': batch.name,
      };
    });

    return NextResponse.json({
      success: true,
      data: exportData,
      filename: `${batch.name}_标注结果_${new Date().toISOString().slice(0, 10)}.csv`,
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
