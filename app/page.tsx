import { createClient } from "@/utils/supabase/server"
import Header from '@/components/layout/Header'
import HomeContent from '@/components/landing/HomeContent'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile if user exists to provide immediate data to Header/UserMenu
  let profile = null;
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, tokens, orcid_id')
      .eq('id', user.id)
      .single();
    profile = profileData;
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="relative z-10">
        <Header user={user} profile={profile} />

        {/* Client-side content with i18n translations */}
        <HomeContent />
      </div>
    </div>
  );
}
