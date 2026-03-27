/**
 * 行动建议内容格式化
 * 输入: node_Script_uncA_output 原始 JSON 字符串
 * 输出: 结构化的行动建议内容
 */

export interface ActionSuggestion {
  content: string;
  buttons: string[];
  raw: string;
}

export interface FormattedActionSuggestion {
  success: boolean;
  data?: ActionSuggestion;
  raw: string;
  error?: string;
}

/**
 * 解析行动建议内容
 * 处理 {"output":"..."} 格式，提取正文和按钮
 */
export function parseActionSuggestion(raw: string): FormattedActionSuggestion {
  if (!raw || raw.trim() === '') {
    return {
      success: true,
      raw: '',
    };
  }

  try {
    // 尝试解析外层 JSON
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 不是 JSON，直接作为纯文本处理
      return {
        success: true,
        data: {
          content: cleanText(raw),
          buttons: extractButtonsFromText(raw),
          raw,
        },
        raw,
      };
    }

    // 提取 output 字段
    const output = parsed.output || parsed.content || parsed.text || parsed.data || '';
    
    if (typeof output !== 'string') {
      return {
        success: false,
        raw,
        error: 'output 字段不是字符串',
      };
    }

    // 清洗内容
    const cleanedContent = cleanText(output);
    
    // 提取按钮
    const buttons = extractButtons(output);

    return {
      success: true,
      data: {
        content: cleanedContent,
        buttons,
        raw,
      },
      raw,
    };
  } catch (error) {
    return {
      success: false,
      raw,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

/**
 * 清洗文本内容
 */
function cleanText(text: string): string {
  if (!text) return '';

  return text
    // 处理转义的换行符
    .replace(/\\n/g, '\n')
    // 处理 HTML 换行标签
    .replace(/<br\s*\/?>/gi, '\n')
    // 处理其他常见的 HTML 标签（保留内容，去掉标签）
    .replace(/<\/?[^>]+(>|$)/g, '')
    // 处理转义的引号
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    // 处理转义的反斜杠
    .replace(/\\\\/g, '\\')
    // 处理转义的制表符
    .replace(/\\t/g, '\t')
    // 处理多余的换行（保留最多两个连续换行）
    .replace(/\n{3,}/g, '\n\n')
    // 去掉行首行尾空格
    .trim();
}

/**
 * 从文本中提取按钮
 * 支持 <button>标签 和 [按钮文案] 格式
 */
function extractButtons(text: string): string[] {
  const buttons: string[] = [];

  // 提取 <button> 标签中的文案
  const buttonRegex = /<button[^>]*>(.*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(text)) !== null) {
    const buttonText = match[1]
      .replace(/<[^>]+>/g, '') // 去掉内部 HTML 标签
      .replace(/\\"/g, '"')
      .trim();
    if (buttonText && !buttons.includes(buttonText)) {
      buttons.push(buttonText);
    }
  }

  // 如果没有找到 button 标签，尝试其他格式
  if (buttons.length === 0) {
    // 尝试匹配【】或 [] 中的内容作为建议动作
    const bracketRegex = /[【\[]([^【\[】\]]+)[】\]]/g;
    while ((match = bracketRegex.exec(text)) !== null) {
      const actionText = match[1].trim();
      if (actionText && !buttons.includes(actionText)) {
        buttons.push(actionText);
      }
    }
  }

  return buttons;
}

/**
 * 从纯文本中提取可能的按钮（降级处理）
 */
function extractButtonsFromText(text: string): string[] {
  return extractButtons(text);
}

/**
 * 截断长文本
 */
export function truncateActionContent(text: string, maxLength: number = 500): { text: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { text, isTruncated: false };
  }

  return {
    text: text.slice(0, maxLength) + '...',
    isTruncated: true,
  };
}
