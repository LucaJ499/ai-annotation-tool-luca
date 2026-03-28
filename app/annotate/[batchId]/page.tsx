import { Suspense } from 'react';
import AnnotateContent from './AnnotateContent';

// 告诉 Next.js 不要静态生成，每次访问时动态渲染
export const dynamic = 'force-dynamic';

// ✅ 页面主组件是 Server Component，只负责包裹
export default function AnnotatePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">加载中...</div>}>
      <AnnotateContent />
    </Suspense>
  );
}
