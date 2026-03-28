'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function NewBatchPage() {
  const router = useRouter();
  const [batchName, setBatchName] = useState('');
  const [annotators, setAnnotators] = useState<string[]>(['']);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setErrorDetail('');

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setError('Excel 文件为空');
        setPreview([]);
        setDetectedFields([]);
        return;
      }

      // 检测字段
      const fields = Object.keys(jsonData[0] as object);
      setDetectedFields(fields);
      setPreview(jsonData.slice(0, 3) as any[]);
      
      console.log('[前端] 检测到字段:', fields);
    } catch (err: any) {
      console.error('[前端] Excel 解析失败:', err);
      setError('解析 Excel 失败');
      setErrorDetail(err.message || '请检查文件格式是否为有效的 .xlsx 或 .xls 文件');
      setPreview([]);
      setDetectedFields([]);
    }
  }, []);

  const handleAddAnnotator = () => {
    setAnnotators([...annotators, '']);
  };

  const handleRemoveAnnotator = (index: number) => {
    if (annotators.length <= 1) return;
    setAnnotators(annotators.filter((_, i) => i !== index));
  };

  const handleAnnotatorChange = (index: number, value: string) => {
    const newAnnotators = [...annotators];
    newAnnotators[index] = value;
    setAnnotators(newAnnotators);
  };

  const handleSubmit = async () => {
    // 重置错误
    setError('');
    setErrorDetail('');

    // 校验批次名称
    if (!batchName.trim()) {
      setError('请输入批次名称');
      return;
    }

    // 校验标注人
    const validAnnotators = annotators.filter((a) => a.trim());
    if (validAnnotators.length === 0) {
      setError('请至少添加一位标注人');
      return;
    }

    // 校验文件
    if (!file) {
      setError('请上传 Excel 文件');
      return;
    }

    setLoading(true);

    try {
      // 读取 Excel
      let jsonData;
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } catch (parseErr: any) {
        setError('Excel 解析失败');
        setErrorDetail(parseErr.message || '无法读取 Excel 文件，请检查文件格式');
        setLoading(false);
        return;
      }

      if (!jsonData || jsonData.length === 0) {
        setError('Excel 文件中没有数据');
        setLoading(false);
        return;
      }

      // 检查批次大小限制
      const MAX_SAMPLES = 5000;
      if (jsonData.length > MAX_SAMPLES) {
        setError(`Excel 数据量超过限制`);
        setErrorDetail(`单次最多支持 ${MAX_SAMPLES} 条样本，当前有 ${jsonData.length} 条。请拆分 Excel 文件后分批上传。`);
        setLoading(false);
        return;
      }

      console.log('[前端] 准备提交，样本数量:', jsonData.length);
      console.log('[前端] 标注人:', validAnnotators);

      // 提交请求
      let response;
      try {
        response = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: batchName.trim(),
            annotators: validAnnotators,
            samples: jsonData,
          }),
        });
      } catch (networkErr: any) {
        setError('网络请求失败');
        setErrorDetail(networkErr.message || '无法连接到服务器，请检查网络连接');
        setLoading(false);
        return;
      }

      // 解析响应
      let result;
      try {
        result = await response.json();
      } catch (jsonErr: any) {
        setError('服务器响应解析失败');
        setErrorDetail(`状态码: ${response.status}, 无法解析响应内容`);
        setLoading(false);
        return;
      }

      console.log('[前端] 服务器响应:', result);

      if (result.success) {
        // 成功，跳转到首页
        router.push('/');
      } else {
        // 失败，显示具体错误
        setError('创建批次失败');
        setErrorDetail(result.error || '服务器返回未知错误');
      }
    } catch (err: any) {
      console.error('[前端] 提交失败:', err);
      setError('创建批次失败');
      setErrorDetail(err.message || '发生未知错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 期望的字段列表
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
  const hasExtraFields = detectedFields.some(f => !expectedFields.includes(f));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">新建标注批次</h2>
      </div>

      <div className="space-y-6">
        {/* 批次名称 */}
        <div className="card">
          <label className="form-label">批次名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="例如：搬家助手评测-第1批"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        {/* 标注人 */}
        <div className="card">
          <label className="form-label mb-3">标注人</label>
          <div className="space-y-3">
            {annotators.map((annotator, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  className="form-input flex-1"
                  placeholder={`标注人 ${index + 1}`}
                  value={annotator}
                  onChange={(e) => handleAnnotatorChange(index, e.target.value)}
                />
                {annotators.length > 1 && (
                  <button
                    onClick={() => handleRemoveAnnotator(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAddAnnotator}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            + 添加标注人
          </button>
        </div>

        {/* 文件上传 */}
        <div className="card">
          <label className="form-label mb-3">上传 Excel 文件</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-gray-600 mb-1">
                {file ? file.name : '点击上传 Excel 文件'}
              </span>
              <span className="text-sm text-gray-400">
                支持 .xlsx, .xls 格式
              </span>
            </label>
          </div>

          {/* 字段检测提示 */}
          {detectedFields.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                检测到 {detectedFields.length} 个字段:
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedFields.map((field) => (
                  <span
                    key={field}
                    className={`text-xs px-2 py-1 rounded ${
                      expectedFields.includes(field)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {field}
                  </span>
                ))}
              </div>
              {missingFields.length > 0 && (
                <div className="mt-2 text-xs text-orange-600">
                  <span className="font-medium">缺失字段:</span> {missingFields.join(', ')}
                </div>
              )}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                预览（前 {preview.length} 条，共检测到数据）:
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left text-gray-600 font-medium"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((value: any, j) => (
                          <td key={j} className="px-3 py-2 text-gray-800">
                            {String(value).slice(0, 50)}
                            {String(value).length > 50 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {(error || errorDetail) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                {error && (
                  <p className="font-medium text-red-800">{error}</p>
                )}
                {errorDetail && (
                  <p className="text-sm text-red-700 mt-1">{errorDetail}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>创建中...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>创建批次</span>
              </>
            )}
          </button>
          <Link href="/" className="btn-secondary">
            取消
          </Link>
        </div>
      </div>
    </div>
  );
}
