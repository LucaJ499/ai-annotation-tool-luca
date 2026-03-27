/**
 * 知识召回结果格式化
 * 输入: node_ZhiShangRAGRerank_zIOZ_output 原始值
 * 输出: 结构化的召回片段数组
 */

export interface KnowledgeFragment {
  index: number;
  id?: string;
  chunkId?: string;
  title?: string;
  source?: string;
  url?: string;
  content: string;
  score?: number;
  fineScore?: number;
  recallScore?: number;
  recallSource?: string;
  labels?: string[];
  uv?: number;
  pv?: number;
}

export interface FormattedKnowledgeRecall {
  success: boolean;
  fragments: KnowledgeFragment[];
  raw: string;
  error?: string;
}

/**
 * 解析知识召回结果
 * 支持多种可能的JSON结构，包括 rerank_docs 格式
 */
export function parseKnowledgeRecall(raw: string): FormattedKnowledgeRecall {
  if (!raw || raw.trim() === '') {
    return {
      success: true,
      fragments: [],
      raw: '',
    };
  }

  try {
    // 尝试解析JSON
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      // 不是JSON，尝试按片段切分
      return parseAsFragments(raw);
    }

    // 处理 rerank_docs 结构（新的标准格式）
    if (data.rerank_docs && Array.isArray(data.rerank_docs)) {
      const fragments: KnowledgeFragment[] = data.rerank_docs.map((item: any, idx: number) => {
        return {
          index: idx + 1,
          id: item.id || item.docId || undefined,
          chunkId: item.chunkId || item.chunk_id || undefined,
          title: item.title || undefined,
          source: item.recallSource || item.source || undefined,
          url: item.url || undefined,
          content: item.content || '',
          score: typeof item.score === 'number' ? item.score : undefined,
          fineScore: typeof item.fineScore === 'number' ? item.fineScore : undefined,
          recallScore: typeof item.recallScore === 'number' ? item.recallScore : undefined,
          recallSource: item.recallSource || undefined,
          labels: Array.isArray(item.labels) ? item.labels : undefined,
          uv: typeof item.uv === 'number' ? item.uv : undefined,
          pv: typeof item.pv === 'number' ? item.pv : undefined,
        };
      });

      return {
        success: true,
        fragments,
        raw,
      };
    }

    // 处理其他可能的数组结构
    let items: any[] = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.fragments && Array.isArray(data.fragments)) {
      items = data.fragments;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.recall_results && Array.isArray(data.recall_results)) {
      items = data.recall_results;
    } else if (typeof data === 'object' && data.id) {
      // 单条数据对象
      items = [data];
    }

    const fragments: KnowledgeFragment[] = items.map((item, idx) => {
      // 尝试提取各个字段（支持多种可能的字段名）
      const id = extractField(item, ['id', 'doc_id', 'document_id', 'chunk_id', 'fragment_id', 'docId']);
      const chunkId = extractField(item, ['chunkId', 'chunk_id', 'paragraph_id']);
      const title = extractField(item, ['title', 'doc_title', 'document_title', 'name', 'doc_name', 'source_title']);
      const source = extractField(item, ['source', 'doc_source', 'document_source', 'recallSource']);
      const url = extractField(item, ['url', 'link', 'doc_url', 'document_url', 'path', 'source_url']);
      const content = extractField(item, ['content', 'text', 'fragment', 'snippet', 'body', 'document', 'chunk', 'paragraph']);
      
      return {
        index: idx + 1,
        id: id || undefined,
        chunkId: chunkId || undefined,
        title: title || undefined,
        source: source || undefined,
        url: url || undefined,
        content: content || formatRawItem(item),
        score: typeof item.score === 'number' ? item.score : undefined,
        fineScore: typeof item.fineScore === 'number' ? item.fineScore : undefined,
        recallScore: typeof item.recallScore === 'number' ? item.recallScore : undefined,
        recallSource: item.recallSource || undefined,
        labels: Array.isArray(item.labels) ? item.labels : undefined,
        uv: typeof item.uv === 'number' ? item.uv : undefined,
        pv: typeof item.pv === 'number' ? item.pv : undefined,
      };
    });

    return {
      success: true,
      fragments,
      raw,
    };
  } catch (error) {
    // 解析失败，尝试按片段切分
    return parseAsFragments(raw);
  }
}

/**
 * 当JSON解析失败时，尝试按 {"id": 或 {" 作为片段切分
 */
function parseAsFragments(raw: string): FormattedKnowledgeRecall {
  // 尝试按 {" 切分
  const fragmentRegex = /\{[^{}]*"id"[^{}]*\}/g;
  const matches = raw.match(fragmentRegex);

  if (matches && matches.length > 0) {
    const fragments: KnowledgeFragment[] = matches.map((match, idx) => {
      try {
        const item = JSON.parse(match);
        return {
          index: idx + 1,
          id: item.id || undefined,
          chunkId: item.chunkId || item.chunk_id || undefined,
          title: item.title || undefined,
          source: item.source || item.recallSource || undefined,
          url: item.url || undefined,
          content: item.content || item.text || item.fragment || JSON.stringify(item),
          score: typeof item.score === 'number' ? item.score : undefined,
          fineScore: typeof item.fineScore === 'number' ? item.fineScore : undefined,
          recallScore: typeof item.recallScore === 'number' ? item.recallScore : undefined,
          recallSource: item.recallSource || undefined,
          labels: Array.isArray(item.labels) ? item.labels : undefined,
          uv: typeof item.uv === 'number' ? item.uv : undefined,
          pv: typeof item.pv === 'number' ? item.pv : undefined,
        };
      } catch {
        return {
          index: idx + 1,
          content: match,
        };
      }
    });

    return {
      success: true,
      fragments,
      raw,
    };
  }

  // 完全无法解析，返回原始文本作为一个片段
  return {
    success: false,
    fragments: [{
      index: 1,
      content: raw,
    }],
    raw,
    error: '无法解析为结构化数据',
  };
}

/**
 * 从对象中提取字段值（尝试多个可能的字段名）
 */
function extractField(obj: any, possibleKeys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;

  for (const key of possibleKeys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        // 如果是对象，尝试提取其中的文本字段
        if (value.text) return String(value.text);
        if (value.content) return String(value.content);
        return JSON.stringify(value).slice(0, 200); // 限制长度
      }
    }
  }

  return null;
}

/**
 * 格式化原始对象为可读文本
 */
function formatRawItem(item: any): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    // 尝试提取最有意义的字段
    const fields = ['content', 'text', 'fragment', 'snippet', 'body', 'title', 'name'];
    for (const field of fields) {
      if (item[field] && typeof item[field] === 'string') {
        return item[field];
      }
    }
    // 返回格式化的JSON
    return JSON.stringify(item, null, 2);
  }
  return String(item);
}

/**
 * 截断长文本
 */
export function truncateText(text: string, maxLength: number = 300): { text: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { text, isTruncated: false };
  }

  return {
    text: text.slice(0, maxLength) + '...',
    isTruncated: true,
  };
}

/**
 * 处理 content 中的换行符，将 \n 转换为真实换行
 */
export function processContentNewlines(content: string): string {
  if (!content) return '';
  return content.replace(/\\n/g, '\n').replace(/\n/g, '\n');
}
