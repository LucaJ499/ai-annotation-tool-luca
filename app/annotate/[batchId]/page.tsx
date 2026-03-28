'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { parseKnowledgeRecall, KnowledgeFragment, truncateText, processContentNewlines } from '@/lib/formatters/knowledgeRecall';
import { parseActionSuggestion, FormattedActionSuggestion, truncateActionContent } from '@/lib/formatters/actionSuggestion';
import { parseSuggestedQuestions, FormattedSuggestedQuestions } from '@/lib/formatters/suggestedQuestions';
import { parseAIOutput, FormattedAIOutput } from '@/lib/formatters/aiOutput';
import { ANNOTATION_FIELDS, UNAVAILABLE_REASONS } from '@/lib/constants';
import { FIELD_MAPPING } from '@/lib/constants';

interface Sample {
  id: string;
  sequence: number;
  systemInternalId: string | null;
  inputInput: string | null;
  inputExpectClassfiy: string | null;
  inputStep: string | null;
  inputObject: string | null;
  inputStatus: string | null;
  outputActualOutput: string | null;
  nodeZhiShangRAGRerank: string | null;
  nodeScriptUncA: string | null;
  nodeScriptHbh1: string | null;
  nodeScriptTezR: string | null;
  nodeScriptORfz: string | null;
  annotation: {
    isClearIntent: string | null;
    intentClassificationAccurate: string | null;
    hasKnowledge: string | null;
    knowledgeTitle: string | null;
    recallAccuracy: string | null;
    replyQuality: string | null;
    unavailableReasons: string;
    remark: string | null;
    actionSuggestionRelevant: string | null;
    guessQuestionsOk: string | null;
  } | null;
}

interface Progress {
  current: number;
  total: number;
  completed: number;
}

export default function AnnotatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const annotator = searchParams.get('annotator') || '';

  const [sample, setSample] = useState<Sample | null>(null);
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 标注表单状态
  const [isClearIntent, setIsClearIntent] = useState('');
  const [intentClassificationAccurate, setIntentClassificationAccurate] = useState('');
  const [hasKnowledge, setHasKnowledge] = useState('');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [recallAccuracy, setRecallAccuracy] = useState('');
  const [replyQuality, setReplyQuality] = useState('');
  const [unavailableReasons, setUnavailableReasons] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [actionSuggestionRelevant, setActionSuggestionRelevant] = useState('');
  const [guessQuestionsOk, setGuessQuestionsOk] = useState('');

  // 格式化结果
  const [knowledgeRecall, setKnowledgeRecall] = useState<{ success: boolean; fragments: KnowledgeFragment[]; raw: string } | null>(null);
  const [aiOutput, setAiOutput] = useState<FormattedAIOutput | null>(null);
  const [actionSuggestion, setActionSuggestion] = useState<FormattedActionSuggestion | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<FormattedSuggestedQuestions | null>(null);

  // 展开状态
  const [expandedFragments, setExpandedFragments] = useState<Set<number>>(new Set());
  const [showRawJson, setShowRawJson] = useState(false);
  const [expandedAction, setExpandedAction] = useState(false);
  const [showRawAction, setShowRawAction] = useState(false);
  const [showRawQuestions, setShowRawQuestions] = useState(false);

  useEffect(() => {
    if (!annotator) {
      router.push(`/batches/${batchId}`);
      return;
    }
    loadNextSample(0);
  }, [batchId, annotator]);

  const loadNextSample = async (currentSequence: number, direction: 'next' | 'prev' = 'next') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/next-sample?batchId=${batchId}&annotator=${encodeURIComponent(annotator)}&currentSequence=${currentSequence}&direction=${direction}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        const { sample: newSample, progress: newProgress } = result.data;
        setSample(newSample);
        setProgress(newProgress);

        // 加载已有标注
        if (newSample.annotation) {
          setIsClearIntent(newSample.annotation.isClearIntent || '');
          setIntentClassificationAccurate(newSample.annotation.intentClassificationAccurate || '');
          setHasKnowledge(newSample.annotation.hasKnowledge || '');
          setKnowledgeTitle(newSample.annotation.knowledgeTitle || '');
          setRecallAccuracy(newSample.annotation.recallAccuracy || '');
          setReplyQuality(newSample.annotation.replyQuality || '');
          setUnavailableReasons(
            newSample.annotation.unavailableReasons
              ? JSON.parse(newSample.annotation.unavailableReasons)
              : []
          );
          setRemark(newSample.annotation.remark || '');
          setActionSuggestionRelevant(newSample.annotation.actionSuggestionRelevant || '');
          setGuessQuestionsOk(newSample.annotation.guessQuestionsOk || '');
        } else {
          // 重置表单
          setIsClearIntent('');
          setIntentClassificationAccurate('');
          setHasKnowledge('');
          setKnowledgeTitle('');
          setRecallAccuracy('');
          setReplyQuality('');
          setUnavailableReasons([]);
          setRemark('');
          setActionSuggestionRelevant('');
          setGuessQuestionsOk('');
        }

        // 格式化知识召回结果
        if (newSample.nodeZhiShangRAGRerank) {
          setKnowledgeRecall(parseKnowledgeRecall(newSample.nodeZhiShangRAGRerank));
        } else {
          setKnowledgeRecall(null);
        }

        // 格式化AI输出
        if (newSample.outputActualOutput) {
          setAiOutput(parseAIOutput(newSample.outputActualOutput));
        } else {
          setAiOutput(null);
        }

        // 格式化行动建议内容
        if (newSample.nodeScriptUncA) {
          setActionSuggestion(parseActionSuggestion(newSample.nodeScriptUncA));
        } else {
          setActionSuggestion(null);
        }

        // 格式化猜你想问内容
        if (newSample.nodeScriptHbh1) {
          setSuggestedQuestions(parseSuggestedQuestions(newSample.nodeScriptHbh1));
        } else {
          setSuggestedQuestions(null);
        }

        setExpandedFragments(new Set());
        setExpandedAction(false);
      } else {
        // 没有更多样本
        if (direction === 'next' && currentSequence > 0) {
          alert('已经是最后一条了');
        } else if (direction === 'prev') {
          alert('已经是第一条了');
        }
      }
    } catch (error) {
      console.error('加载样本失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (navigateAfterSave: 'next' | 'stay' | 'prev' | 'finish' = 'stay') => {
    if (!sample) return;

    setSaving(true);
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: sample.id,
          batchId,
          annotator,
          isClearIntent,
          intentClassificationAccurate,
          hasKnowledge,
          knowledgeTitle: hasKnowledge === '有' ? knowledgeTitle : '',
          recallAccuracy,
          replyQuality,
          unavailableReasons: ['部分可用', '完全不可用'].includes(replyQuality) ? unavailableReasons : [],
          remark,
          actionSuggestionRelevant,
          guessQuestionsOk,
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (navigateAfterSave === 'next') {
          loadNextSample(sample.sequence, 'next');
        } else if (navigateAfterSave === 'prev') {
          loadNextSample(sample.sequence, 'prev');
        } else if (navigateAfterSave === 'finish') {
          // 最后一条保存完成，显示提示并返回
          alert('已完成全部标注\n\n当前批次的待标注数据已全部完成，点击确定返回上一页。');
          router.push(`/batches/${batchId}`);
        } else {
          // 更新进度
          setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 判断是否为最后一条
  const isLastSample = progress.current === progress.total && progress.total > 0;

  const toggleFragment = (index: number) => {
    const newSet = new Set(expandedFragments);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedFragments(newSet);
  };

  const handleReasonToggle = (reason: string) => {
    setUnavailableReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  if (!annotator) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* 顶部导航 */}
      <div className="nav-bar">
        <div className="nav-info">
          <Link href={`/batches/${batchId}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="nav-label">标注人: </span>
            <span className="nav-value">{annotator}</span>
          </div>
          <div className="progress-text">
            进度: {progress.current} / {progress.total} (已完成 {progress.completed})
          </div>
          {isLastSample && (
            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded border border-amber-200">
              当前已是最后一条
            </span>
          )}
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="button-group">
          <button
            onClick={() => loadNextSample(sample?.sequence || 0, 'prev')}
            disabled={loading || progress.current <= 1}
            className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一条</span>
          </button>
          <button
            onClick={() => handleSave('stay')}
            disabled={saving}
            className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
          <button
            onClick={() => handleSave(isLastSample ? 'finish' : 'next')}
            disabled={saving}
            className="btn-primary flex items-center space-x-1 disabled:opacity-50"
          >
            <span>{isLastSample ? '保存并完成' : '保存并下一条'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">加载中...</div>
      ) : !sample ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">暂无数据</div>
      ) : (
        <div className="flex-1 three-column-layout">
          {/* 第一列：用户问题与 AI 输出 */}
          <div className="column-qa">
            {/* Sticky 原始输入区块 */}
            <div className="sticky-query-section">
              <div className="original-input-card">
                {/* 用户输入 - 视觉重点 */}
                <div className="query-highlight-section">
                  <div className="query-label">{FIELD_MAPPING['input_input']}</div>
                  <div className="query-content">
                    {sample.inputInput || '-'}
                  </div>
                </div>

                {/* 辅助信息区域 */}
                <div className="auxiliary-info-grid">
                  <div className="auxiliary-item">
                    <span className="auxiliary-label">{FIELD_MAPPING['input_expect_classfiy']}</span>
                    <span className="auxiliary-value">{sample.inputExpectClassfiy || '-'}</span>
                  </div>
                  <div className="auxiliary-item">
                    <span className="auxiliary-label">{FIELD_MAPPING['input_step']}</span>
                    <span className="auxiliary-value">{sample.inputStep || '-'}</span>
                  </div>
                  <div className="auxiliary-item">
                    <span className="auxiliary-label">{FIELD_MAPPING['input_object']}</span>
                    <span className="auxiliary-value">{sample.inputObject || '-'}</span>
                  </div>
                  <div className="auxiliary-item">
                    <span className="auxiliary-label">{FIELD_MAPPING['input_status']}</span>
                    <span className="auxiliary-value">{sample.inputStatus || '-'}</span>
                  </div>
                </div>

                {/* 用户提问ID - 弱化展示 */}
                <div className="sample-id-section">
                  <span className="sample-id-label">{FIELD_MAPPING['__system_internal_id__']}</span>
                  <span className="sample-id-value">{sample.systemInternalId || '-'}</span>
                </div>
              </div>
            </div>

            {/* 下方滚动内容区域 */}
            <div className="column-scroll-content">
              {/* AI打标意图分类 */}
              {(sample.nodeScriptTezR || sample.nodeScriptORfz) && (
                <div className="info-card">
                  <h3 className="card-title">意图分类结果</h3>
                  {sample.nodeScriptTezR && (
                    <div className="mb-3">
                      <span className="field-label-text">{FIELD_MAPPING['node_Script_tezR_output']}</span>
                      <p className="field-content">{sample.nodeScriptTezR}</p>
                    </div>
                  )}
                  {sample.nodeScriptORfz && (
                    <div>
                      <span className="field-label-text">{FIELD_MAPPING['node_Script_oRFz_output']}</span>
                      <p className="field-content">{sample.nodeScriptORfz}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI最终输出 */}
              <div className="info-card">
                <h3 className="card-title">{FIELD_MAPPING['output_actual_output']}</h3>
                {aiOutput ? (
                  aiOutput.success ? (
                    <div className="space-y-4">
                      <div 
                        className="ai-output-content"
                        dangerouslySetInnerHTML={{ __html: aiOutput.content }}
                      />
                      {aiOutput.references.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">参考来源</h4>
                          <ul className="space-y-1">
                            {aiOutput.references.map((ref) => (
                              <li key={ref.index} className="text-sm">
                                <span className="text-blue-600 font-medium">[{ref.index}]</span>{' '}
                                {ref.url ? (
                                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {ref.title}
                                  </a>
                                ) : (
                                  <span className="text-gray-700">{ref.title}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="field-content">{aiOutput.raw}</div>
                  )
                ) : (
                  <div className="text-gray-400">无数据</div>
                )}
              </div>

              {/* 行动建议内容 */}
              {actionSuggestion && actionSuggestion.raw && (
                <div className="info-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="card-title">{FIELD_MAPPING['node_Script_uncA_output']}</h3>
                    <button
                      onClick={() => setShowRawAction(!showRawAction)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {showRawAction ? '查看格式化' : '查看原始内容'}
                    </button>
                  </div>

                  {showRawAction ? (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs whitespace-pre-wrap break-all">{actionSuggestion.raw}</pre>
                    </div>
                  ) : (
                    actionSuggestion.success && actionSuggestion.data ? (
                      <div className="space-y-4">
                        {actionSuggestion.data.content && (
                          <div>
                            <div
                              className="recall-fragment-text"
                              style={{ maxHeight: expandedAction ? 'none' : '150px', overflow: 'hidden' }}
                            >
                              {expandedAction
                                ? actionSuggestion.data.content
                                : truncateActionContent(actionSuggestion.data.content, 300).text}
                            </div>
                            {actionSuggestion.data.content.length > 300 && (
                              <button
                                onClick={() => setExpandedAction(!expandedAction)}
                                className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                              >
                                {expandedAction ? '收起' : '展开更多'}
                              </button>
                            )}
                          </div>
                        )}
                        {actionSuggestion.data.buttons.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs text-blue-700 font-medium mb-2">建议动作：</div>
                            <div className="flex flex-wrap gap-2">
                              {actionSuggestion.data.buttons.map((button, idx) => (
                                <span
                                  key={idx}
                                  className="action-button"
                                >
                                  {button}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">内容解析失败，显示原始文本：</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          {actionSuggestion.raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').slice(0, 500)}
                          {actionSuggestion.raw.length > 500 ? '...' : ''}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 猜你想问内容 */}
              {suggestedQuestions && suggestedQuestions.raw && (
                <div className="info-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="card-title">{FIELD_MAPPING['node_Script_hBH1_output']}</h3>
                    <button
                      onClick={() => setShowRawQuestions(!showRawQuestions)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {showRawQuestions ? '查看格式化' : '查看原始内容'}
                    </button>
                  </div>

                  {showRawQuestions ? (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs whitespace-pre-wrap break-all">{suggestedQuestions.raw}</pre>
                    </div>
                  ) : (
                    suggestedQuestions.success && suggestedQuestions.questions.length > 0 ? (
                      <div className="space-y-2">
                        {suggestedQuestions.questions.map((question, idx) => (
                          <div
                            key={idx}
                            className="suggested-question-item"
                          >
                            <span className="suggested-question-number">
                              {idx + 1}
                            </span>
                            <span className="suggested-question-text">
                              {question.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">内容解析失败，显示原始文本：</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          {suggestedQuestions.raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').slice(0, 500)}
                          {suggestedQuestions.raw.length > 500 ? '...' : ''}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 第二列：AI召回知识依据 */}
          <div className="column-knowledge">
            <div className="column-scroll-content">
              <div className="info-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="card-title">{FIELD_MAPPING['node_ZhiShangRAGRerank_zIOZ_output']}</h3>
                  {knowledgeRecall && knowledgeRecall.raw && (
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {showRawJson ? '查看卡片' : '查看原始 JSON'}
                    </button>
                  )}
                </div>
                
                {showRawJson ? (
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {knowledgeRecall?.raw || '无数据'}
                    </pre>
                  </div>
                ) : (
                  knowledgeRecall ? (
                    knowledgeRecall.success && knowledgeRecall.fragments.length > 0 ? (
                      <div className="space-y-3">
                        {knowledgeRecall.fragments.map((fragment) => {
                          const isExpanded = expandedFragments.has(fragment.index);
                          const processedContent = processContentNewlines(fragment.content);
                          const { text: displayText, isTruncated } = isExpanded
                            ? { text: processedContent, isTruncated: false }
                            : truncateText(processedContent, 400);

                          return (
                            <div key={fragment.index} className="recall-fragment-card">
                              <div className="recall-fragment-header">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="recall-fragment-index">第 {fragment.index} 条</span>
                                  {fragment.labels && fragment.labels.length > 0 && (
                                    <div className="flex gap-1">
                                      {fragment.labels.map((label, idx) => (
                                        <span key={idx} className="label-tag">
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {fragment.title && (
                                  <div className="recall-fragment-title">{fragment.title}</div>
                                )}
                                <div className="recall-fragment-meta">
                                  {fragment.id && <span>docId: {fragment.id}</span>}
                                  {fragment.chunkId && <span className="ml-3">chunkId: {fragment.chunkId}</span>}
                                </div>
                              </div>

                              <div className="recall-fragment-content">
                                <div 
                                  className="recall-fragment-text"
                                  style={{ maxHeight: isExpanded ? 'none' : '200px', overflow: 'hidden' }}
                                >
                                  {displayText}
                                </div>
                                {(isTruncated || processedContent.length > 400) && (
                                  <button
                                    onClick={() => toggleFragment(fragment.index)}
                                    className="text-xs text-blue-600 hover:text-blue-700 mt-3 font-medium"
                                  >
                                    {isExpanded ? '收起' : '展开更多'}
                                  </button>
                                )}
                              </div>

                              <div className="recall-fragment-footer">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="recall-fragment-scores">
                                    {fragment.score !== undefined && (
                                      <span>score: <span className="font-medium text-gray-700">{fragment.score.toFixed(3)}</span></span>
                                    )}
                                    {fragment.fineScore !== undefined && (
                                      <span>fineScore: <span className="font-medium text-gray-700">{fragment.fineScore.toFixed(3)}</span></span>
                                    )}
                                    {fragment.recallScore !== undefined && (
                                      <span>recallScore: <span className="font-medium text-gray-700">{fragment.recallScore.toFixed(3)}</span></span>
                                    )}
                                    {fragment.recallSource && (
                                      <span>source: <span className="font-medium text-gray-700">{fragment.recallSource}</span></span>
                                    )}
                                  </div>
                                  {fragment.url && (
                                    <a
                                      href={fragment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    >
                                      查看原文
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">无法解析为结构化数据</div>
                        <div className="text-xs text-gray-500 whitespace-pre-wrap break-all">{knowledgeRecall.raw.slice(0, 500)}{knowledgeRecall.raw.length > 500 ? '...' : ''}</div>
                      </div>
                    )
                  ) : (
                    <div className="text-gray-400 text-center py-8">无数据</div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 第三列：人工标注 */}
          <div className="column-annotation">
            <div className="annotation-card">
              <h3 className="card-title" style={{ fontSize: '18px', marginBottom: '20px' }}>标注</h3>

              <div className="space-y-5">
                {/* A. 是否为意图清晰问题 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.isClearIntent.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.isClearIntent.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="isClearIntent"
                          value={option}
                          checked={isClearIntent === option}
                          onChange={(e) => setIsClearIntent(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* B. 搬家意图分类是否准确 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.intentClassificationAccurate.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.intentClassificationAccurate.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="intentClassificationAccurate"
                          value={option}
                          checked={intentClassificationAccurate === option}
                          onChange={(e) => setIntentClassificationAccurate(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* C. 知识库内是否有知识 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.hasKnowledge.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.hasKnowledge.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="hasKnowledge"
                          value={option}
                          checked={hasKnowledge === option}
                          onChange={(e) => setHasKnowledge(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* D. 对应知识标题 */}
                {hasKnowledge === '有' && (
                  <div className="form-section">
                    <label className="form-label">{ANNOTATION_FIELDS.knowledgeTitle.label}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={knowledgeTitle}
                      onChange={(e) => setKnowledgeTitle(e.target.value)}
                      placeholder="请输入知识标题"
                    />
                  </div>
                )}

                {/* E. 知识召回是否准确 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.recallAccuracy.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.recallAccuracy.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="recallAccuracy"
                          value={option}
                          checked={recallAccuracy === option}
                          onChange={(e) => setRecallAccuracy(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* F. AI回复质量 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.replyQuality.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.replyQuality.options.map((option) => (
                      <label key={option} className="radio-label" title={ANNOTATION_FIELDS.replyQuality.tooltips[option]}>
                        <input
                          type="radio"
                          name="replyQuality"
                          value={option}
                          checked={replyQuality === option}
                          onChange={(e) => setReplyQuality(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* G. 不可用原因 */}
                {['部分可用', '完全不可用'].includes(replyQuality) && (
                  <div className="form-section">
                    <label className="form-label">{ANNOTATION_FIELDS.unavailableReasons.label}</label>
                    <div className="form-options">
                      {UNAVAILABLE_REASONS.map((reason) => (
                        <label key={reason} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={unavailableReasons.includes(reason)}
                            onChange={() => handleReasonToggle(reason)}
                            className="text-blue-600 rounded"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* H. 备注 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.remark.label}</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="可选填"
                  />
                </div>

                {/* I. 行动建议内容是否相关 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.actionSuggestionRelevant.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.actionSuggestionRelevant.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="actionSuggestionRelevant"
                          value={option}
                          checked={actionSuggestionRelevant === option}
                          onChange={(e) => setActionSuggestionRelevant(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* J. 猜你想问至少不离谱 */}
                <div className="form-section">
                  <label className="form-label">{ANNOTATION_FIELDS.guessQuestionsOk.label}</label>
                  <div className="form-options">
                    {ANNOTATION_FIELDS.guessQuestionsOk.options.map((option) => (
                      <label key={option} className="radio-label">
                        <input
                          type="radio"
                          name="guessQuestionsOk"
                          value={option}
                          checked={guessQuestionsOk === option}
                          onChange={(e) => setGuessQuestionsOk(e.target.value)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
