"use client";

import { useState, useEffect } from "react";
// 1. Import useRouter from next/navigation
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Image as ImageIcon, AtSign, Save } from "lucide-react";

export default function AccountSettingsPage() {
  // 2. Initialize the router
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || "");
      const userWithUsername = session.user as { username?: string };
      setUsername(userWithUsername.username || "");
      setAvatar(session.user.image || "");
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, avatar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: fullName,
          username: username,
          image: avatar
        },
      });
      
      toast.success("Profile successfully updated!");
      
      // 3. Refresh the current route to reflect updates everywhere
      router.refresh();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Card untuk Pengaturan Profil */}
          <div className="bg-black/80 rounded-2xl shadow-2xl border border-red-900/50 overflow-hidden backdrop-blur-sm">
            
            {/* Header Card */}
            <div className="p-8 border-b border-red-900/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-800/50 rounded-xl flex items-center justify-center shadow-lg border border-red-700/50">
                  <User className="w-6 h-6 text-red-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Account Profile</h2>
                  <p className="text-sm text-gray-300 mt-1">
                    Update your public profile information.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Konten Card */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Kolom Kiri: Avatar */}
                <div className="md:col-span-1 space-y-2 flex flex-col items-center md:items-start">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Profile Picture
                  </label>
                  <div className="relative">
                    <img 
                      src={avatar || 'https://avatar.vercel.sh/fallback.png'} 
                      alt="Avatar Preview" 
                      className="w-32 h-32 rounded-full border-2 border-red-900/50 shadow-lg object-cover" 
                    />
                  </div>
                   <div className="relative w-full mt-4">
                     <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                     <input
                       type="url"
                       value={avatar}
                       onChange={(e) => setAvatar(e.target.value)}
                       className="w-full pl-10 pr-3 py-2 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-red-900/50 bg-black/20"
                       placeholder="Image URL"
                     />
                   </div>
                </div>

                {/* Kolom Kanan: Nama & Username */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-red-900/50 bg-black/20"
                        placeholder="Satoshi Nakamoto"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-red-900/50 bg-black/20"
                        placeholder="username"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Card (Tombol Aksi) */}
            <div className="p-8 border-t border-red-900/30 flex justify-end">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-red-900/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}