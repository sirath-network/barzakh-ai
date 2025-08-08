"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // ✅ Tambahkan useSession

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession(); // ✅ Gunakan session dan update
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Load existing user data
  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || "");
      setUsername(session.user.username || "");
      setAvatar(session.user.image || "");
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password && password !== confirmPassword) {
      alert("Password not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username,
          avatar,
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");

      // ✅ Update session dengan data terbaru
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: fullName,
          username: username,
          image: avatar,
        },
      });

      // ✅ Reset password fields
      setPassword("");
      setConfirmPassword("");

      alert("Profile successfully updated!");
      
      router.push("/");
    } catch (err: any) {
      alert(err.message || "Something Wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="p-6 max-w-2xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nama Lengkap */}
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-border/50 bg-background px-3 py-2 rounded-md text-sm"
          placeholder="Satoshi Nakamoto"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-border/50 bg-background px-3 py-2 rounded-md text-sm"
          placeholder="@username"
        />
      </div>

      {/* Avatar */}
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">
          Avatar URL
        </label>
        <input
          type="url"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          className="w-full border border-border/50 bg-background px-3 py-2 rounded-md text-sm"
          placeholder="https://example.com/avatar.png"
        />
        {avatar && (
          <img
            src={avatar}
            alt="Preview Avatar"
            className="w-16 h-16 rounded-full mt-2 border shadow"
          />
        )}
      </div>

      {/* Reset Password */}
      <div className="border-t pt-4">
        <h2 className="font-semibold text-base mb-2">Update Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border/50 bg-background px-3 py-2 rounded-md text-sm"
              placeholder="Leave blank to keep unchanged"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Confirmation Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-border/50 bg-background px-3 py-2 rounded-md text-sm"
              placeholder="Confirmation New Password"
            />
          </div>
        </div>
      </div>

      {/* Tombol Simpan dan Back sejajar */}
      <div className="flex justify-between items-center mt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="underline underline-offset-4 text-sm text-muted-foreground hover:text-primary"
        >
          &larr; Back to Home
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  </div>
);
}