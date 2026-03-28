/**
 * AI最终输出格式化
 * 输入: output_actual_output 原始值
 * 输出: 结构化的AI输出（正文 + 参考来源）
 */

export interface Reference {
  index: number;
  title: string;
  url?: string;
}

export interface FormattedAIOutput {
  success: boolean;
  content: string;
  references: Reference[];
  raw: string;
  error?: string;
}

/**
 * 解析AI最终输出
 * 支持Markdown、JSON、带引用角标的文本
 */
export function parseAIOutput(raw: string): FormattedAIOutput {
  if (!raw || raw.trim() === '') {
    return {
      success: true,
      content: '',
      references: [],
      raw: '',
    };
  }

  try {
    // 首先尝试解析JSON
    const jsonResult = tryParseJSON(raw);
    if (jsonResult) {
      return jsonResult;
    }

    // 按Markdown文本处理
    return parseMarkdownOutput(raw);
  } catch (error) {
    return {
      success: false,
      content: raw,
      references: [],
      raw,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

/**
 * 尝试解析JSON结构
 */
function tryParseJSON(raw: string): FormattedAIOutput | null {
  try {
    const data = JSON.parse(raw);

    // 提取正文
    let content = '';
    if (typeof data === 'string') {
      content = data;
    } else if (data.answer || data.content || data.text || data.response) {
      content = data.answer || data.content || data.text || data.response;
    } else if (data.result) {
      content = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
    } else {
      // 无法确定正文字段，返回null让外层处理
      return null;
    }

    // 提取参考来源
    const references: Reference[] = [];
    const refsData = data.references || data.sources || data.citations || data.links;

    if (Array.isArray(refsData)) {
      refsData.forEach((ref, idx) => {
        if (typeof ref === 'string') {
          references.push({ index: idx + 1, title: ref });
        } else if (typeof ref === 'object') {
          references.push({
            index: idx + 1,
            title: ref.title || ref.name || ref.text || JSON.stringify(ref),
            url: ref.url || ref.link || ref.source,
          });
        }
      });
    }

    // 处理正文中的引用和URL
    const processedContent = processContent(content);

    return {
      success: true,
      content: processedContent,
      references,
      raw,
    };
  } catch {
    return null;
  }
}

/**
 * 解析Markdown格式输出
 * 处理引用角标 [1] [[1]] 等
 */
function parseMarkdownOutput(raw: string): FormattedAIOutput {
  let content = raw;
  const references: Reference[] = [];

  // 尝试提取文末的参考来源区域
  const refSectionMatch = raw.match(/(?:##?\s*(?:参考|来源|引用|References|Sources)[\s\S]*)/i);

  if (refSectionMatch) {
    const refSection = refSectionMatch[0];
    // 从正文中移除参考来源区域（保留在原始内容中）
    content = raw.replace(refSection, '').trim();

    // 解析参考来源
    const refLines = refSection.split('\n').slice(1); // 跳过标题行

    refLines.forEach((line) => {
      // 匹配 [1] 标题 或 [1] [标题](url) 或 [1] url
      const match = line.match(/^\[(\d+)\]\s*(.+)$/);
      if (match) {
        const index = parseInt(match[1], 10);
        const refContent = match[2].trim();

        // 尝试提取markdown链接 [title](url)
        const markdownLinkMatch = refContent.match(/\[(.+?)\]\((.+?)\)/);
        if (markdownLinkMatch) {
          references.push({
            index,
            title: markdownLinkMatch[1],
            url: markdownLinkMatch[2],
          });
        } else {
          // 尝试提取纯URL
          const urlMatch = refContent.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch) {
            references.push({
              index,
              title: refContent.replace(urlMatch[1], '').trim() || `参考来源 ${index}`,
              url: urlMatch[1],
            });
          } else {
            references.push({
              index,
              title: refContent,
            });
          }
        }
      }
    });
  }

  // 如果没有找到参考来源区域，尝试从正文中提取 [N] 格式的引用
  if (references.length === 0) {
    const citationMatches = Array.from(content.matchAll(/\[\[?(\d+)\]?\]/g));
    const citationIndices = new Set<number>();

    citationMatches.forEach((match) => {
      citationIndices.add(parseInt(match[1], 10));
    });

    // 为每个引用编号创建一个占位参考
    citationIndices.forEach((idx) => {
      references.push({
        index: idx,
        title: `参考来源 ${idx}`,
      });
    });

    // 按index排序
    references.sort((a, b) => a.index - b.index);
  }

  // 处理正文中的引用和URL
  const processedContent = processContent(content);

  return {
    success: true,
    content: processedContent,
    references,
    raw,
  };
}

/**
 * 处理正文内容：
 * 1. 处理引用角标 [[N]] -> [N]
 * 2. 处理 [N](url) 格式
 * 3. 自动识别裸露URL并转为链接
 * 4. 处理多个连续引用 [1][2][3]
 */
function processContent(content: string): string {
  let processed = content;

  // 1. 统一 [[N]] 为 [N]
  processed = processed.replace(/\[\[(\d+)\]\]/g, '[$1]');

  // 2. 处理 [N](url) 格式 - 保留为可点击链接
  processed = processed.replace(/\[(\d+)\]\((https?:\/\/[^\s\)]+)\)/g, 
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="citation-link">[$1]</a>');

  // 3. 处理单独的 [N] 引用角标
  processed = processed.replace(/\[(\d+)\](?!\()/g, 
    '<sup class="citation" data-ref="$1">[$1]</sup>');

  // 4. 自动识别裸露URL并转为链接（排除已经在a标签中的URL）
  // 使用负向回顾后发，避免替换已经在链接中的URL
  const urlRegex = /(?<!["'=])\b(https?:\/\/[^\s\<\>\"\'\)\]\[]+)(?![^<]*>|[^<>]*<\/a)/g;
  processed = processed.replace(urlRegex, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="external-link">$1</a>');

  // 5. 将换行符转为<br/>
  processed = processed.replace(/\n/g, '<br/>');

  return processed;
}

/**
 * 从原始内容中提取URL
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s\)\]\>]+)/g;
  return text.match(urlRegex) || [];
}
