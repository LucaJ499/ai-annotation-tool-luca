'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Users, CheckCircle, Trash2, BarChart3 } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  createdAt: string;
  totalCount: number;
  completedCount: number;
  annotators: string[];
  status: string;
  mode?: string;
}

export default function HomePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches');
      const result = await response.json();
      if (result.success) {
        setBatches(result.data);
      }
    } catch (error) {
      console.error('获取批次列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/batches/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setDeleteConfirmId(null);
        fetchBatches();
      }
    } catch (error) {
      console.error('删除批次失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getProgressPercent = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">标注批次</h2>
        <Link
          href="/batches/new"
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新建批次</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">还没有标注批次</p>
          <Link href="/batches/new" className="btn-primary">
            创建第一个批次
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => {
            const progress = getProgressPercent(batch.completedCount, batch.totalCount);

            return (
              <div key={batch.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {batch.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${batch.mode === 'compare' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {batch.mode === 'compare' ? '对比模式' : '普通模式'}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          progress === 100
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {progress === 100 ? '已完成' : '进行中'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                      <span className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{batch.totalCount} 条样本</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{batch.annotators.length} 位标注人</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{batch.completedCount} 条已标注</span>
                      </span>
                      <span>创建于 {formatDate(batch.createdAt)}</span>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-sm text-gray-600">标注人:</span>
                      <div className="flex space-x-2">
                        {batch.annotators.map((name) => (
                          <span
                            key={name}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/batches/${batch.id}/analytics`}
                      className="btn-secondary text-sm flex items-center space-x-1"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>数据</span>
                    </Link>
                    <Link
                      href={`/batches/${batch.id}`}
                      className="btn-secondary text-sm"
                    >
                      详情
                    </Link>
                    {deleteConfirmId === batch.id ? (
                      <div className="flex items-center space-x-2 bg-red-50 rounded-lg p-1">
                        <span className="text-xs text-red-600 px-2">确认删除?</span>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(batch.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          确认
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(batch.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="删除批次"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
