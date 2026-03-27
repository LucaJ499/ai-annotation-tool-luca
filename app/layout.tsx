import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI知识问答效果评测标注工具',
  description: '搬家助手AI能力人工评测工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              AI知识问答效果评测标注工具
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
