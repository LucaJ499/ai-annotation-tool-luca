// Excel 原始字段名到业务含义的映射（已更新）
export const FIELD_MAPPING = {
  // 原始字段名: 业务含义（中文）
  '__system_internal_id__': '用户提问ID',
  'input_input': '用户输入',
  'input_expect_classfiy': '预期意图分类',
  'input_step': '搬家阶段',
  'input_object': '系统推荐搬家对象',
  'input_status': '搬家状态',
  'output_actual_output': 'AI最终输出',
  'node_Script_uncA_output': '行动建议内容',
  'node_Script_hBH1_output': '猜你想问内容',
  'node_Script_tezR_output': 'AI打标意图分类',
  'node_Script_oRFz_output': 'AI打标意图分类原因',
  'node_ZhiShangRAGRerank_zIOZ_output': 'AI召回知识结果',
} as const;

// 原始字段名列表（用于Excel解析）
export const EXCEL_FIELDS = [
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
] as const;

// 标注字段定义（已更新）
export const ANNOTATION_FIELDS = {
  isClearIntent: {
    label: '是否为意图清晰问题',
    type: 'single' as const,
    options: ['是', '否'],
  },
  intentClassificationAccurate: {
    label: '搬家意图分类是否准确',
    type: 'single' as const,
    options: ['是', '否'],
  },
  hasKnowledge: {
    label: '知识库内是否有知识',
    type: 'single' as const,
    options: ['有', '没有'],
  },
  knowledgeTitle: {
    label: '如有知识，对应知识标题',
    type: 'text' as const,
    dependsOn: { field: 'hasKnowledge', value: '有' },
  },
  recallAccuracy: {
    label: '知识召回是否准确',
    type: 'single' as const,
    options: ['是', '否'],
  },
  replyQuality: {
    label: 'AI回复质量',
    type: 'single' as const,
    options: ['完全可用', '部分可用', '完全不可用'],
    tooltips: {
      '完全可用': '能够完全解决用户的问题，回复内容准确、完整、格式标准且表达逻辑清晰',
      '部分可用': '包含用户提问问题的关键内容或者信息，能够在一部分程度上帮助用户解决问题，但是存在缺陷',
      '完全不可用': '答案内容对用户来说没有帮助，属于答非所问、无法解答或者存在明显逻辑错误',
    },
  },
  unavailableReasons: {
    label: '不可用原因',
    type: 'multiple' as const,
    options: [
      '事实不准确',
      '链接不准确',
      '引用参考不准确',
      '回答结果没有覆盖必要信息（如前置依赖条件或操作步骤）',
      '答案格式显示不正确',
      '表达逻辑混乱',
      '表达结构不完整',
    ],
    dependsOn: { field: 'replyQuality', values: ['部分可用', '完全不可用'] },
  },
  remark: {
    label: '备注',
    type: 'textarea' as const,
    required: false,
  },
  actionSuggestionRelevant: {
    label: '行动建议内容是否相关',
    type: 'single' as const,
    options: ['是', '否'],
  },
  guessQuestionsOk: {
    label: '猜你想问至少不离谱',
    type: 'single' as const,
    options: ['是', '否'],
  },
} as const;

// 不可用原因选项
export const UNAVAILABLE_REASONS = [
  '事实不准确',
  '链接不准确',
  '引用参考不准确',
  '回答结果没有覆盖必要信息（如前置依赖条件或操作步骤）',
  '答案格式显示不正确',
  '表达逻辑混乱',
  '表达结构不完整',
] as const;

// 导出字段（原始字段 + 标注字段）
export const EXPORT_FIELDS = {
  // 原始字段
  ...FIELD_MAPPING,
  // 标注字段
  'annotator': '标注人',
  'annotatedAt': '标注时间',
  'isClearIntent': '是否为意图清晰问题',
  'intentClassificationAccurate': '搬家意图分类是否准确',
  'hasKnowledge': '知识库内是否有知识',
  'knowledgeTitle': '对应知识标题',
  'recallAccuracy': '知识召回是否准确',
  'replyQuality': 'AI回复质量',
  'unavailableReasons': '不可用原因',
  'remark': '备注',
  'actionSuggestionRelevant': '行动建议内容是否相关',
  'guessQuestionsOk': '猜你想问至少不离谱',
  'batchName': '批次名称',
} as const;
