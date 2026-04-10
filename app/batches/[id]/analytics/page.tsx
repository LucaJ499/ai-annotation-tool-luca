'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import SimpleBarChart from '@/app/components/SimpleBarChart';

interface MetricData {
  value: number;
  numerator: number;
  denominator: number;
  noData: boolean;
}

interface AnalyticsData {
  batch: {
    id: string;
    name: string;
    totalCount: number;
    completedCount: number;
    mode?: string;
  };
  mainMetric: {
    aiReplyWeighted: MetricData;
    aiReplyBasic: MetricData;
  };
  compareMetrics?: {
    deepseek: {
      aiReplyWeighted: MetricData;
      aiReplyBasic: MetricData;
    };
    gpt: {
      aiReplyWeighted: MetricData;
      aiReplyBasic: MetricData;
    };
  };
  processMetrics: {
    clearIntent: MetricData;
    intentAccurate: MetricData;
    knowledgeCoverage: MetricData;
    recallAccuracy: MetricData;
  };
  distributions: {
    clearIntent: Record<string, number>;
    intentAccurate: Record<string, number>;
    hasKnowledge: Record<string, number>;
    replyQuality: Record<string, number>;
    deepseekReplyQuality?: Record<string, number>;
    gptReplyQuality?: Record<string, number>;
    compareResult?: Record<string, number>;
    actionRelevant: Record<string, number>;
    guessQuestionsOk: Record<string, number>;
  };
}

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelFilter, setModelFilter] = useState<'all' | 'deepseek' | 'gpt'>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [batchId, modelFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/batches/${batchId}/analytics?model_filter=${modelFilter}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      setError('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error || '数据加载失败'}</div>
      </div>
    );
  }

  const { batch, mainMetric, compareMetrics, processMetrics, distributions } = data;

  const isCompareMode = batch.mode === 'compare';

  const ProcessMetricCard = ({ 
    title, 
    metric, 
    color 
  }: { 
    title: string; 
    metric: MetricData; 
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: color }}
        />
      </div>
      {metric.noData ? (
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-gray-300">-</div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold" style={{ color }}>
            {metric.value}%
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {metric.numerator} / {metric.denominator}
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">批次数据</h1>
                <p className="text-sm text-gray-500">{batch.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>总样本: {batch.totalCount}</span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" />
                <span>已标注: {batch.completedCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 第一部分：核心指标区 */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
            核心指标
          </h2>
          
          {/* 主指标大卡片 + 过程指标小卡片 */}
          <div className={`grid grid-cols-1 ${isCompareMode ? 'gap-6' : 'lg:grid-cols-3 gap-6'}`}>
            {/* 主指标：AI回复加权可用率 */}
            {isCompareMode && compareMetrics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center space-x-2 mb-4 relative z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-blue-100 font-medium">DeepSeek AI回复加权可用率</span>
                  </div>
                  
                  {compareMetrics.deepseek.aiReplyWeighted.noData ? (
                    <div className="text-center py-8 relative z-10">
                      <div className="text-5xl font-bold text-blue-200">-</div>
                      <p className="text-blue-200 mt-2">暂无可计算样本</p>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="text-6xl font-bold mb-4">
                        {compareMetrics.deepseek.aiReplyWeighted.value}%
                      </div>
                      <div className="space-y-2 text-blue-100">
                        <p className="text-sm">
                          完全可用=1，部分可用=0.5，完全不可用=0
                        </p>
                        <p className="text-sm">
                          基础可用率: <span className="font-semibold text-white">{compareMetrics.deepseek.aiReplyBasic.value}%</span>
                          <span className="text-blue-200 ml-1">
                            ({compareMetrics.deepseek.aiReplyBasic.numerator}/{compareMetrics.deepseek.aiReplyBasic.denominator})
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center space-x-2 mb-4 relative z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-emerald-100 font-medium">GPT AI回复加权可用率</span>
                  </div>
                  
                  {compareMetrics.gpt.aiReplyWeighted.noData ? (
                    <div className="text-center py-8 relative z-10">
                      <div className="text-5xl font-bold text-emerald-200">-</div>
                      <p className="text-emerald-200 mt-2">暂无可计算样本</p>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="text-6xl font-bold mb-4">
                        {compareMetrics.gpt.aiReplyWeighted.value}%
                      </div>
                      <div className="space-y-2 text-emerald-100">
                        <p className="text-sm">
                          完全可用=1，部分可用=0.5，完全不可用=0
                        </p>
                        <p className="text-sm">
                          基础可用率: <span className="font-semibold text-white">{compareMetrics.gpt.aiReplyBasic.value}%</span>
                          <span className="text-emerald-200 ml-1">
                            ({compareMetrics.gpt.aiReplyBasic.numerator}/{compareMetrics.gpt.aiReplyBasic.denominator})
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-1 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-purple-100 font-medium">AI回复加权可用率</span>
                </div>
                
                {mainMetric.aiReplyWeighted.noData ? (
                  <div className="text-center py-8">
                    <div className="text-5xl font-bold text-purple-200">-</div>
                    <p className="text-purple-200 mt-2">暂无可计算样本</p>
                  </div>
                ) : (
                  <>
                    <div className="text-6xl font-bold mb-4">
                      {mainMetric.aiReplyWeighted.value}%
                    </div>
                    <div className="space-y-2 text-purple-100">
                      <p className="text-sm">
                        完全可用=1，部分可用=0.5，完全不可用=0
                      </p>
                      <p className="text-sm">
                        基础可用率: <span className="font-semibold text-white">{mainMetric.aiReplyBasic.value}%</span>
                        <span className="text-purple-200 ml-1">
                          ({mainMetric.aiReplyBasic.numerator}/{mainMetric.aiReplyBasic.denominator})
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 过程指标小卡片 */}
            <div className={`${isCompareMode ? '' : 'lg:col-span-2'} grid grid-cols-2 md:grid-cols-4 gap-4`}>
              <ProcessMetricCard 
                title="意图清晰率" 
                metric={processMetrics.clearIntent} 
                color="#3b82f6"
              />
              <ProcessMetricCard 
                title="搬家意图分类准确率" 
                metric={processMetrics.intentAccurate} 
                color="#10b981"
              />
              <ProcessMetricCard 
                title="知识覆盖率" 
                metric={processMetrics.knowledgeCoverage} 
                color="#f59e0b"
              />
              <ProcessMetricCard 
                title="知识召回准确率" 
                metric={processMetrics.recallAccuracy} 
                color="#8b5cf6"
              />
            </div>
          </div>
        </div>

        {/* 第二部分：链路分布图区 */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
            指标链路分布
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!isCompareMode && (
              <>
                {/* 1. 是否为意图清晰问题 */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-medium text-gray-900 mb-6">是否为意图清晰问题</h3>
                  <SimpleBarChart 
                    data={distributions.clearIntent}
                    colors={['#3b82f6', '#9ca3af']}
                  />
                </div>

                {/* 2. 搬家意图分类是否准确 */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-medium text-gray-900 mb-6">搬家意图分类是否准确</h3>
                  <SimpleBarChart 
                    data={distributions.intentAccurate}
                    colors={['#10b981', '#ef4444']}
                  />
                </div>
              </>
            )}

            {/* 3. 知识库内是否有知识 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-6">知识库内是否有知识</h3>
              <SimpleBarChart 
                data={distributions.hasKnowledge}
                colors={['#3b82f6', '#9ca3af']}
              />
            </div>

            {/* 4. AI回复质量分布 */}
            {isCompareMode && distributions.deepseekReplyQuality && distributions.gptReplyQuality ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-medium text-gray-900 mb-6">DeepSeek回复质量分布</h3>
                  <SimpleBarChart 
                    data={distributions.deepseekReplyQuality}
                    colors={['#10b981', '#f59e0b', '#ef4444']}
                  />
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-medium text-gray-900 mb-6">GPT回复质量分布</h3>
                  <SimpleBarChart 
                    data={distributions.gptReplyQuality}
                    colors={['#10b981', '#f59e0b', '#ef4444']}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-6">AI回复质量分布</h3>
                <SimpleBarChart 
                  data={distributions.replyQuality}
                  colors={['#10b981', '#f59e0b', '#ef4444']}
                />
              </div>
            )}

            {/* 5. 行动建议内容是否相关 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-6">行动建议内容是否相关</h3>
              <SimpleBarChart 
                data={distributions.actionRelevant}
                colors={['#10b981', '#ef4444']}
              />
            </div>

            {/* 6. 猜你想问至少不离谱 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-6">猜你想问至少不离谱</h3>
              <SimpleBarChart 
                data={distributions.guessQuestionsOk}
                colors={['#10b981', '#ef4444']}
              />
            </div>

            {/* 7. 对比效果 (仅对比模式) */}
            {isCompareMode && distributions.compareResult && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-6">对比效果</h3>
                <SimpleBarChart 
                  data={distributions.compareResult}
                  colors={['#059669', '#10b981', '#9ca3af', '#3b82f6', '#2563eb']}
                />
              </div>
            )}
          </div>
        </div>

        {/* 第三部分：统计口径说明 */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 mb-3">统计口径说明</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="mb-1"><strong className="text-gray-900">意图清晰率</strong>：意图清晰问题数 / 全量已标注</p>
              <p className="mb-1"><strong className="text-gray-900">搬家意图分类准确率</strong>：意图分类准确数 / 全量已标注</p>
              <p className="mb-1"><strong className="text-gray-900">知识覆盖率</strong>：有知识数 / 意图准确的搬家问题</p>
            </div>
            <div>
              <p className="mb-1"><strong className="text-gray-900">知识召回准确率</strong>：召回准确数 / 有知识的问题</p>
              <p className="mb-1"><strong className="text-gray-900">AI回复加权可用率</strong>：(完全可用×1 + 部分可用×0.5) / 全量</p>
              <p className="text-gray-400">所有统计仅基于已提交标注的数据</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
