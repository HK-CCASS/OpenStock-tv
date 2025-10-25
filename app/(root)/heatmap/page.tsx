import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import UserHeatmap from '@/components/heatmap/UserHeatmap';

export const metadata = {
  title: '股票热力图 - OpenStock',
  description: '基于您的观察列表的实时股票市场热力图',
};

export default async function HeatmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-[#131722]">
      <UserHeatmap userId={session.user.id} />
    </div>
  );
}

