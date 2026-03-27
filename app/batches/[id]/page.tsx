'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Download, Users, FileText, CheckCircle } from 'lucide-react';

interface BatchDetail {
  id: string;
  name: string;
  createdAt: string;
  annotators: string[];
  annotatorProgress: Record<string, { total: number; completed: number }>;
  samples: Array<{
    id: string;
    sequence: number;
    assignedTo: string;
    status: string;
    systemInternalId: string | null;
    inputInput: string | null;
  }>;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotator, setSelectedAnnotator] = useState('');

  useEffect(() => {
    fetchBatchDetail();
  }, [batchId]);

  const fetchBatchDetail = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}`);
      const result = await response.json();
      if (result.success) {
        setBatch(result.data);
        if (result.data.annotators.length > 0) {
          setSelectedAnnotator(result.data.annotators[0]);
        }
      }
    } catch (error) {
      console.error('获取批次详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}/export`);
      const result = await response.json();

      if (result.success) {
        // 转换为 CSV
        const data = result.data;
        if (data.length === 0) {
          alert('没有数据可导出');
          return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map((row: any) =>
            headers
              .map((h) => {
                const value = row[h] || '';
                // 处理包含逗号或换行符的值
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(',')
          ),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = result.filename;
        link.click();
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败');
    }
  };

  const handleStartAnnotate = () => {
    if (!selectedAnnotator) {
      alert('请选择标注人');
      return;
    }
    router.push(`/annotate/${batchId}?annotator=${encodeURIComponent(selectedAnnotator)}`);
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (!batch) {
    return <div className="text-center py-12 text-red-600">批次不存在</div>;
  }

  const totalProgress = batch.samples.filter((s) => s.status === 'annotated').length;
  const totalSamples = batch.samples.length;
  const progressPercent = totalSamples > 0 ? Math.round((totalProgress / totalSamples) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{batch.name}</h2>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">总样本数</p>
              <p className="text-2xl font-bold text-gray-900">{totalSamples}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{totalProgress}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">标注人数</p>
              <p className="text-2xl font-bold text-gray-900">{batch.annotators.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div>
            <p className="text-sm text-gray-500 mb-1">总进度</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 标注人进度 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">标注人进度</h3>
        <div className="space-y-4">
          {batch.annotators.map((name) => {
            const progress = batch.annotatorProgress[name] || { total: 0, completed: 0 };
            const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

            return (
              <div key={name} className="flex items-center space-x-4">
                <span className="w-24 font-medium text-gray-700">{name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-24 text-right">
                  {progress.completed}/{progress.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 开始标注 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">开始标注</h3>
        <div className="flex items-center space-x-4">
          <select
            className="form-select w-48"
            value={selectedAnnotator}
            onChange={(e) => setSelectedAnnotator(e.target.value)}
          >
            <option value="">选择标注人</option>
            {batch.annotators.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button onClick={handleStartAnnotate} className="btn-primary flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>开始标注</span>
          </button>
        </div>
      </div>

      {/* 导出 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">导出结果</h3>
        <button onClick={handleExport} className="btn-secondary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>导出 CSV</span>
        </button>
      </div>
    </div>
  );
}
