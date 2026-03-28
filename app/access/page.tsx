'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';

export default function AccessPage() {
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 获取跳转来源路径
  const fromPath = searchParams.get('from') || '/';

  // 检查是否已验证（防止重复访问此页面）
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/access/check');
        if (response.ok) {
          // 已验证，跳转到首页
          router.push('/');
        }
      } catch {
        // 未验证，留在当前页面
      }
    };
    checkAccess();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKey.trim()) {
      setError('请输入访问口令');
      return;
    }

    setLoading(true);
    setError('');
    setDebugInfo('正在发送请求...');

    try {
      console.log('[前端] 开始提交验证请求');
      const response = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      console.log('[前端] 收到响应，状态码:', response.status);
      setDebugInfo(`服务器响应状态: ${response.status}`);

      let result;
      try {
        result = await response.json();
        console.log('[前端] 响应数据:', result);
      } catch (parseError) {
        console.error('[前端] 解析响应失败:', parseError);
        setError('服务器返回数据格式错误');
        setDebugInfo('无法解析服务器响应');
        return;
      }

      if (result.success) {
        console.log('[前端] 验证成功，准备跳转到:', fromPath);
        setDebugInfo('验证成功！正在跳转...');
        // 验证成功，跳转到原始页面或首页
        router.push(fromPath);
      } else {
        console.log('[前端] 验证失败:', result.error);
        setError(result.error || '访问口令错误，请重新输入');
        setDebugInfo(`验证失败: ${result.error || '未知错误'}`);
      }
    } catch (err: any) {
      console.error('[前端] 请求失败:', err);
      setError('网络请求失败，请检查网络连接');
      setDebugInfo(`请求异常: ${err.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 卡片 */}
        <div className="bg-white rounded-2xl shadow-lg border p-8">
          {/* 图标 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            请输入访问口令
          </h1>

          {/* 说明 */}
          <p className="text-gray-500 text-center mb-8 text-sm">
            如需使用本工具，请联系luca获取密钥
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 输入框 */}
            <div>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="输入访问口令"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                disabled={loading}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 调试信息 */}
            {debugInfo && (
              <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                {debugInfo}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <span>{loading ? '验证中...' : '进入系统'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* 底部提示 */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              验证通过后，7天内无需再次输入口令
            </p>
          </div>
        </div>

        {/* 项目名称 */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">EBP AI标注工具</p>
        </div>
      </div>
    </div>
  );
}
