import { Suspense } from 'react';
import AccessContent from './AccessContent';

// 告诉 Next.js 不要静态生成，每次访问时动态渲染
export const dynamic = 'force-dynamic';

// ✅ 页面主组件是 Server Component，只负责包裹
export default function AccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>}>
      <AccessContent />
    </Suspense>
  );
}
