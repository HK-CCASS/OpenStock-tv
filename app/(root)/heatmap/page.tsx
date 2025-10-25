import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import UserHeatmap from '@/components/heatmap/UserHeatmap';

export const metadata = {
  title: '热力图 - OpenStock',
  description: '基于您的观察列表的实时股票热力图',
};

export default async function HeatmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  // 直接返回组件，避免容器嵌套
  return <UserHeatmap userId={session.user.id} />;
}

