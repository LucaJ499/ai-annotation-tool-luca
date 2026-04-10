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
      
      const isCompareMode = batch.mode === 'compare';

      const baseRow = {
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

        // 基础标注字段
        'annotator': annotation?.annotator || '',
        'annotatedAt': annotation?.annotatedAt
          ? new Date(annotation.annotatedAt).toISOString()
          : '',
        'isClearIntent': annotation?.isClearIntent || '',
        'intentClassificationAccurate': annotation?.intentClassificationAccurate || '',
        'hasKnowledge': annotation?.hasKnowledge || '',
        'knowledgeTitle': annotation?.knowledgeTitle || '',
        'recallAccuracy': annotation?.recallAccuracy || '',
        'actionSuggestionRelevant': annotation?.actionSuggestionRelevant || '',
        'guessQuestionsOk': annotation?.guessQuestionsOk || '',
        'batchName': batch.name,
      };

      if (isCompareMode) {
        return {
          ...baseRow,
          // DeepSeek 模型字段
          'deepseekQuality': annotation?.deepseekQuality || '',
          'deepseekUnavailableReasons': annotation?.deepseekUnavailableReasons
            ? JSON.parse(annotation.deepseekUnavailableReasons).join('; ')
            : '',
          'deepseekRemark': annotation?.deepseekRemark || '',
          
          // GPT 模型字段
          'gptQuality': annotation?.gptQuality || '',
          'gptUnavailableReasons': annotation?.gptUnavailableReasons
            ? JSON.parse(annotation.gptUnavailableReasons).join('; ')
            : '',
          'gptRemark': annotation?.gptRemark || '',
          
          // 对比结论字段
          'compareResult': annotation?.compareResult || '',
          'compareReason': annotation?.compareReason || '',
        };
      } else {
        return {
          ...baseRow,
          // 单模型字段
          'replyQuality': annotation?.replyQuality || '',
          'unavailableReasons': annotation?.unavailableReasons
            ? JSON.parse(annotation.unavailableReasons).join('; ')
            : '',
          'remark': annotation?.remark || '',
        };
      }
    });

    // 定义字段中文映射映射（可选：让导出的 CSV 表头更友好）
    const headersMapping: Record<string, string> = {
      '__system_internal_id__': '系统内部ID',
      'input_input': '用户输入',
      'input_expect_classfiy': '期望分类',
      'input_step': '步骤',
      'input_object': '对象',
      'input_status': '状态',
      'output_actual_output': '实际输出',
      'annotator': '标注人',
      'annotatedAt': '标注时间',
      'isClearIntent': '是否为意图清晰问题',
      'intentClassificationAccurate': '搬家意图分类是否准确',
      'hasKnowledge': '知识库内是否有知识',
      'knowledgeTitle': '知识标题',
      'recallAccuracy': '知识召回是否准确',
      'actionSuggestionRelevant': '行动建议内容是否相关',
      'guessQuestionsOk': '猜你想问至少不离谱',
      'batchName': '批次名称',
      
      // 单模型
      'replyQuality': 'AI回复质量',
      'unavailableReasons': '不可用原因',
      'remark': '备注',

      // 对比模式
      'deepseekQuality': 'DeepSeek回复质量',
      'deepseekUnavailableReasons': 'DeepSeek不可用原因',
      'deepseekRemark': 'DeepSeek备注',
      'gptQuality': 'GPT回复质量',
      'gptUnavailableReasons': 'GPT不可用原因',
      'gptRemark': 'GPT备注',
      'compareResult': '对比效果',
      'compareReason': '对比原因说明'
    };

    // 应用映射（如果有的话）
    const mappedExportData = exportData.map(row => {
      const newRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        newRow[headersMapping[key] || key] = value;
      }
      return newRow;
    });

    return NextResponse.json({
      success: true,
      data: mappedExportData,
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
