import Header from "@/components/Header";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin layout for protected administrative routes
 *
 * This layout wraps all admin pages, providing authentication protection
 * and role-based access control. It checks for valid user sessions and
 * verifies admin privileges before rendering admin content.
 */

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  // Get current user session using Better Auth
  const session = await auth.api.getSession({ headers: await headers() });

  // Redirect unauthenticated users to sign-in page
  if (!session?.user) {
    redirect('/sign-in');
  }

  // TODO: Check admin role
  // For now, allow all authenticated users
  // In production, uncomment the role check below:
  /*
  const role = session.user.role || 'user';
  if (!['admin', 'super_admin'].includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  */

  // Extract and format user data for component consumption
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-400">
      {/* Admin Header */}
      <Header user={user} />

      {/* Admin Content Container */}
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
