import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取批次列表
export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            samples: true,
            annotations: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: batches.map((batch) => ({
        ...batch,
        totalCount: batch._count.samples,
        completedCount: batch._count.annotations,
        annotators: JSON.parse(batch.annotators),
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/batches] 获取批次列表失败:', error);
    return NextResponse.json(
      { success: false, error: `获取批次列表失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 辅助函数：将任意值转换为字符串
function toString(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

// 创建批次
export async function POST(request: NextRequest) {
  console.log('[POST /api/batches] ========== 开始创建批次 ==========');
  
  try {
    // Step 1: 解析请求体
    console.log('[POST /api/batches] Step 1: 解析请求体...');
    let body;
    try {
      body = await request.json();
      console.log('[POST /api/batches] Step 1: 请求体解析成功');
      console.log('[POST /api/batches] 批次名称:', body.name);
      console.log('[POST /api/batches] 标注人:', body.annotators);
      console.log('[POST /api/batches] 样本数量:', body.samples?.length);
    } catch (parseError: any) {
      console.error('[POST /api/batches] Step 1 失败: 请求体解析失败:', parseError);
      return NextResponse.json(
        { success: false, error: `请求体解析失败: ${parseError.message}` },
        { status: 400 }
      );
    }

    const { name, annotators, samples } = body;

    // Step 2: 参数校验
    console.log('[POST /api/batches] Step 2: 参数校验...');
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.error('[POST /api/batches] Step 2 失败: 批次名称无效');
      return NextResponse.json(
        { success: false, error: '批次名称不能为空' },
        { status: 400 }
      );
    }

    if (!annotators || !Array.isArray(annotators) || annotators.length === 0) {
      console.error('[POST /api/batches] Step 2 失败: 标注人列表无效');
      return NextResponse.json(
        { success: false, error: '请至少添加一位标注人' },
        { status: 400 }
      );
    }

    const validAnnotators = annotators.filter((a: string) => a && a.trim() !== '');
    if (validAnnotators.length === 0) {
      console.error('[POST /api/batches] Step 2 失败: 标注人列表为空');
      return NextResponse.json(
        { success: false, error: '标注人名称不能为空' },
        { status: 400 }
      );
    }

    if (!samples || !Array.isArray(samples)) {
      console.error('[POST /api/batches] Step 2 失败: 样本数据无效');
      return NextResponse.json(
        { success: false, error: '样本数据必须是数组' },
        { status: 400 }
      );
    }

    if (samples.length === 0) {
      console.error('[POST /api/batches] Step 2 失败: 样本数据为空');
      return NextResponse.json(
        { success: false, error: 'Excel 文件中没有数据' },
        { status: 400 }
      );
    }

    // 检查批次大小限制
    const MAX_SAMPLES = 5000;
    if (samples.length > MAX_SAMPLES) {
      console.error(`[POST /api/batches] Step 2 失败: 样本数量超过限制 (${samples.length} > ${MAX_SAMPLES})`);
      return NextResponse.json(
        { success: false, error: `单次最多支持 ${MAX_SAMPLES} 条样本，当前有 ${samples.length} 条。请拆分 Excel 文件后分批上传。` },
        { status: 400 }
      );
    }
    console.log('[POST /api/batches] Step 2: 参数校验通过');

    // Step 3: 分析样本数据结构
    console.log('[POST /api/batches] Step 3: 分析样本数据结构...');
    const firstSample = samples[0];
    const detectedFields = Object.keys(firstSample);
    console.log('[POST /api/batches] 检测到的字段:', detectedFields);

    // 定义期望的字段
    const expectedFields = [
      '__system_internal_id__',
      'input_input',
      'input_expect_classfiy',
      'input_step',
      'input_object',
      'input_status',
      'output_actual_output',
      'node_Script_uncA_output',
      'node_Script_hBH1_output',
      'node_Script_tezR_output',
      'node_Script_oRFz_output',
      'node_ZhiShangRAGRerank_zIOZ_output',
    ];

    // 检查缺失的字段
    const missingFields = expectedFields.filter(f => !detectedFields.includes(f));
    if (missingFields.length > 0) {
      console.warn('[POST /api/batches] 警告: 缺失字段:', missingFields);
    }
    console.log('[POST /api/batches] Step 3: 样本结构分析完成');

    // Step 4: 计算分配策略
    console.log('[POST /api/batches] Step 4: 计算分配策略...');
    const totalSamples = samples.length;
    const samplesPerAnnotator = Math.ceil(totalSamples / validAnnotators.length);
    console.log(`[POST /api/batches] 总样本: ${totalSamples}, 每标注人: ${samplesPerAnnotator}`);
    console.log('[POST /api/batches] Step 4: 分配策略计算完成');

    // Step 5: 数据库事务 - 创建批次和样本
    console.log('[POST /api/batches] Step 5: 开始数据库事务...');
    let batch;
    try {
      batch = await prisma.$transaction(async (tx) => {
        // 5.1 创建批次
        console.log('[POST /api/batches] Step 5.1: 创建 Batch 记录...');
        const newBatch = await tx.batch.create({
          data: {
            name: name.trim(),
            annotators: JSON.stringify(validAnnotators),
            totalCount: totalSamples,
            status: 'in_progress',
          },
        });
        console.log('[POST /api/batches] Step 5.1: Batch 创建成功, ID:', newBatch.id);

        // 5.2 准备样本数据
        console.log('[POST /api/batches] Step 5.2: 准备样本数据...');
        const sampleData = samples.map((sample: any, index: number) => {
          const annotatorIndex = Math.floor(index / samplesPerAnnotator);
          const assignedTo = validAnnotators[Math.min(annotatorIndex, validAnnotators.length - 1)];

          return {
            batchId: newBatch.id,
            sequence: index + 1,
            systemInternalId: toString(sample['__system_internal_id__']),
            inputInput: toString(sample['input_input']),
            inputExpectClassfiy: toString(sample['input_expect_classfiy']),
            inputStep: toString(sample['input_step']),
            inputObject: toString(sample['input_object']),
            inputStatus: toString(sample['input_status']),
            outputActualOutput: toString(sample['output_actual_output']),
            nodeZhiShangRAGRerank: toString(sample['node_ZhiShangRAGRerank_zIOZ_output']),
            nodeScriptUncA: toString(sample['node_Script_uncA_output']),
            nodeScriptHbh1: toString(sample['node_Script_hBH1_output']),
            nodeScriptTezR: toString(sample['node_Script_tezR_output']),
            nodeScriptORfz: toString(sample['node_Script_oRFz_output']),
            assignedTo,
            status: 'pending',
          };
        });
        console.log('[POST /api/batches] Step 5.2: 样本数据准备完成, 数量:', sampleData.length);

        // 5.3 批量创建样本
        console.log('[POST /api/batches] Step 5.3: 批量创建 Sample 记录...');
        try {
          await tx.sample.createMany({
            data: sampleData,
          });
          console.log('[POST /api/batches] Step 5.3: Sample 批量创建成功');
        } catch (sampleError: any) {
          console.error('[POST /api/batches] Step 5.3 失败: Sample 创建失败:', sampleError);
          throw new Error(`Sample 创建失败: ${sampleError.message}`);
        }

        return newBatch;
      }, {
        timeout: 30000, // 30秒超时
      });
      console.log('[POST /api/batches] Step 5: 数据库事务完成');
    } catch (txError: any) {
      console.error('[POST /api/batches] Step 5 失败: 数据库事务失败:', txError);
      throw txError;
    }

    console.log('[POST /api/batches] ========== 创建批次成功 ==========');
    console.log('[POST /api/batches] 批次ID:', batch.id);
    console.log('[POST /api/batches] 批次名称:', batch.name);

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        annotators: validAnnotators,
      },
    });

  } catch (error: any) {
    console.error('[POST /api/batches] ========== 创建批次失败 ==========');
    console.error('[POST /api/batches] 错误类型:', error.constructor.name);
    console.error('[POST /api/batches] 错误消息:', error.message);
    console.error('[POST /api/batches] 错误码:', error.code);
    console.error('[POST /api/batches] 错误详情:', error);

    // 构建详细的错误信息
    let errorMessage = '创建批次失败';
    let errorDetail = '';

    if (error.message) {
      errorMessage = error.message;
    }

    // Prisma 错误处理
    if (error.code) {
      switch (error.code) {
        case 'P2000':
          errorDetail = `数据长度超出限制: ${error.meta?.column_name || '未知字段'}`;
          break;
        case 'P2002':
          errorDetail = `数据重复: ${error.meta?.target?.join(', ') || '未知字段'}`;
          break;
        case 'P2003':
          errorDetail = `外键约束失败: ${error.meta?.field_name || '未知字段'}`;
          break;
        case 'P2005':
          errorDetail = `数据类型错误: ${error.meta?.field_name || '未知字段'}`;
          break;
        case 'P2006':
          errorDetail = `数据无效: ${error.meta?.field_name || '未知字段'}`;
          break;
        case 'P2011':
          errorDetail = `必填字段为空: ${error.meta?.constraint || '未知约束'}`;
          break;
        case 'P2022':
          errorDetail = `数据库字段不匹配: ${error.message}`;
          break;
        case 'P2024':
          errorDetail = `数据库连接超时`;
          break;
        case 'P2025':
          errorDetail = `记录未找到`;
          break;
        case 'P2034':
          errorDetail = `数据库写入冲突，可能是只读数据库或权限问题`;
          break;
        default:
          errorDetail = `数据库错误 [${error.code}]: ${error.message}`;
      }
    }

    // 如果 errorDetail 为空，使用原始错误信息
    const finalError = errorDetail || errorMessage;
    console.error('[POST /api/batches] 返回错误:', finalError);

    return NextResponse.json(
      { success: false, error: finalError },
      { status: 500 }
    );
  }
}
