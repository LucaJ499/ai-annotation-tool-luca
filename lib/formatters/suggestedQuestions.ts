/**
 * 猜你想问内容格式化
 * 输入: node_Script_hBH1_output 原始 JSON 字符串
 * 输出: 结构化的猜你想问列表
 */

export interface SuggestedQuestion {
  title: string;
  raw?: any;
}

export interface FormattedSuggestedQuestions {
  success: boolean;
  questions: SuggestedQuestion[];
  raw: string;
  error?: string;
}

/**
 * 解析猜你想问内容
 * 处理 {"output":"..."} 格式，提取问题列表
 */
export function parseSuggestedQuestions(raw: string): FormattedSuggestedQuestions {
  if (!raw || raw.trim() === '') {
    return {
      success: true,
      questions: [],
      raw: '',
    };
  }

  try {
    // 尝试解析外层 JSON
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 不是 JSON，尝试按行或按特定模式拆分
      const questions = extractQuestionsFromText(raw);
      return {
        success: true,
        questions,
        raw,
      };
    }

    // 提取 output 字段
    const output = parsed.output || parsed.content || parsed.text || parsed.data || parsed;

    // 如果 output 是数组，直接解析
    if (Array.isArray(output)) {
      const questions = output.map((item, index) => parseQuestionItem(item, index)).filter(Boolean) as SuggestedQuestion[];
      return {
        success: true,
        questions,
        raw,
      };
    }

    // 如果 output 是字符串，尝试进一步解析
    if (typeof output === 'string') {
      // 尝试解析为 JSON 数组
      try {
        const innerParsed = JSON.parse(output);
        if (Array.isArray(innerParsed)) {
          const questions = innerParsed.map((item, index) => parseQuestionItem(item, index)).filter(Boolean) as SuggestedQuestion[];
          return {
            success: true,
            questions,
            raw,
          };
        }
      } catch {
        // 不是 JSON 数组，按文本处理
        const questions = extractQuestionsFromText(output);
        return {
          success: true,
          questions,
          raw,
        };
      }
    }

    // 如果 output 是对象，尝试提取问题字段
    if (typeof output === 'object' && output !== null) {
      const questions = parseQuestionItem(output, 0) ? [parseQuestionItem(output, 0)!] : [];
      return {
        success: true,
        questions,
        raw,
      };
    }

    // 降级处理
    const questions = extractQuestionsFromText(raw);
    return {
      success: questions.length > 0,
      questions,
      raw,
    };
  } catch (error) {
    // 解析失败，尝试文本提取
    const questions = extractQuestionsFromText(raw);
    return {
      success: questions.length > 0,
      questions,
      raw,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

/**
 * 解析单个问题项
 */
function parseQuestionItem(item: any, index: number): SuggestedQuestion | null {
  if (!item) return null;

  // 如果是字符串，直接使用
  if (typeof item === 'string') {
    const cleaned = cleanQuestionText(item);
    return cleaned ? { title: cleaned, raw: item } : null;
  }

  // 如果是对象，尝试提取问题标题字段
  if (typeof item === 'object') {
    const possibleKeys = [
      '猜你想问标问',
      'title',
      'question',
      'text',
      'content',
      'name',
      'label',
      'value',
    ];

    for (const key of possibleKeys) {
      const value = item[key];
      if (value && typeof value === 'string') {
        const cleaned = cleanQuestionText(value);
        return cleaned ? { title: cleaned, raw: item } : null;
      }
    }

    // 如果没有找到标准字段，尝试使用对象的第一个字符串值
    for (const key of Object.keys(item)) {
      const value = item[key];
      if (value && typeof value === 'string') {
        const cleaned = cleanQuestionText(value);
        return cleaned ? { title: cleaned, raw: item } : null;
      }
    }
  }

  return null;
}

/**
 * 从纯文本中提取问题列表
 */
function extractQuestionsFromText(text: string): SuggestedQuestion[] {
  if (!text) return [];

  const questions: SuggestedQuestion[] = [];

  // 清洗文本
  const cleaned = text
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\/g, '')
    .trim();

  // 尝试按 JSON 数组格式匹配
  const jsonArrayRegex = /\[\s*\{[\s\S]*?\}\s*\]/;
  const jsonMatch = cleaned.match(jsonArrayRegex);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => parseQuestionItem(item, index)).filter(Boolean) as SuggestedQuestion[];
      }
    } catch {
      // 解析失败，继续其他方式
    }
  }

  // 按行分割，每行作为一个问题
  const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    // 去掉行首的序号标记（如 "1."、"-"、"*" 等）
    const cleanedLine = line
      .replace(/^\s*[\d]+[.．、]\s*/, '') // 去掉 "1." "2、" 等
      .replace(/^\s*[-*•]\s*/, '') // 去掉 "-" "*" "•" 等
      .replace(/^\s*[""'']|[""'']\s*$/g, '') // 去掉行首行尾的引号
      .trim();

    if (cleanedLine && cleanedLine.length > 3) {
      questions.push({
        title: cleanedLine,
        raw: line,
      });
    }
  }

  return questions;
}

/**
 * 清洗问题文本
 */
function cleanQuestionText(text: string): string {
  if (!text) return '';

  return text
    .replace(/\\n/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\/g, '')
    .replace(/^\s*[""'']|[""'']\s*$/g, '')
    .trim();
}
