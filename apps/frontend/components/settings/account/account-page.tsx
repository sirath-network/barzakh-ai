"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Image as ImageIcon, AtSign, Save, Upload, Trash2, CheckCircle, AlertCircle, Shield, Key, Loader2 } from "lucide-react";
import DeleteAccountModal from "./delete-account-modal";
import ImageCropModal from "./image-crop-modal";
import { RESERVED_USERNAMES, isReservedUsername } from "@/lib/reserved-usernames";
import { useSignedR2Url } from "@/hooks/use-signed-r2-url";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [initialData, setInitialData] = useState({ fullName: "", username: "", avatar: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState({ isValid: true, message: "" });
  const [usernameAvailability, setUsernameAvailability] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "error";
    message: string;
  }>({
    status: "idle",
    message: ""
  });

  // Use signed URL for R2 storage avatars
  const { url: signedAvatarUrl, isLoading: isLoadingAvatar } = useSignedR2Url(avatar);

  useEffect(() => {
    if (session?.user) {
      const userWithUsername = session.user as { username?: string };
      const data = {
        fullName: session.user.name || "",
        username: userWithUsername.username || "",
        avatar: session.user.image || ""
      };
      setFullName(data.fullName);
      setUsername(data.username);
      setAvatar(data.avatar);
      setInitialData(data);
    }
  }, [session]);

  const hasChanges =
    fullName !== initialData.fullName ||
    username !== initialData.username ||
    avatar !== initialData.avatar;

  const userEmail = session?.user?.email || '';

  const validateUsername = (value: string) => {
    const normalized = value.toLowerCase();

    if (normalized.length === 0) {
      return { isValid: false, message: "Username is required" };
    }

    if (normalized.length < 3) {
      return { isValid: false, message: "Username must be at least 3 characters" };
    }

    if (normalized.length > 20) {
      return { isValid: false, message: "Username must be less than 20 characters" };
    }

    if (!/^[a-z0-9]+$/.test(normalized)) {
      return { isValid: false, message: "Only lowercase letters and numbers allowed" };
    }

    if (!/^[a-z]/.test(normalized)) {
      return { isValid: false, message: "Must start with a letter" };
    }

    // Check reserved usernames - the function returns true if reserved AND user is not allowed
    if (isReservedUsername(normalized, userEmail)) {
      return { isValid: false, message: "Username is restricted" };
    }

    return { isValid: true, message: "" };
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setUsername(sanitized);
    setUsernameValidation(validateUsername(sanitized));
    setUsernameAvailability({ status: "idle", message: "" });
  };

  useEffect(() => {
    if (!username || !usernameValidation.isValid) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    if (username === initialData.username) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      // Only set checking state after debounce to prevent UI flicker while typing
      setUsernameAvailability({ status: "checking", message: "Checking availability..." });

      try {
        const res = await fetch(`/api/settings?username=${encodeURIComponent(username)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const isTaken = data?.error === "USERNAME_TAKEN";
          const isReserved = data?.error === "USERNAME_RESERVED";
          setUsernameAvailability({
            status: isTaken || isReserved ? "taken" : "error",
            message: isReserved ? "Username is restricted" : isTaken ? "Username is already taken" : "Unable to check availability",
          });
          return;
        }

        const data = await res.json();
        setUsernameAvailability({
          status: data?.available ? "available" : "taken",
          message: data?.available ? "Username is available" : "Username is already taken",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setUsernameAvailability({ status: "error", message: "Unable to check availability" });
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [username, usernameValidation.isValid, initialData.username]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setTempImageSrc(imageSrc);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (croppedImage: string) => {
    setIsUploading(true);
    setShowCropModal(false);

    try {
      // Upload the image
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const newAvatarUrl = data.url;
      setAvatar(newAvatarUrl);

      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username: username.toLowerCase(),
          avatar: newAvatarUrl
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save avatar");

      // Update the session with the new avatar
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          image: newAvatarUrl,
        },
      });

      // Update initial data to reflect the saved state
      setInitialData({
        fullName,
        username,
        avatar: newAvatarUrl
      });

      toast.success("Avatar updated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      setTempImageSrc("");
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageSrc("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateUsername(username);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    setIsLoading(true);

    try {
      const normalizedUsername = username.toLowerCase();

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username: normalizedUsername, avatar }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data?.error === "USERNAME_INVALID") {
          toast.error("Username must be lowercase letters and numbers only (no spaces or symbols).");
          return;
        }
        if (res.status === 400 && data?.error === "USERNAME_REQUIRED") {
          toast.error("Username is required.");
          return;
        }
        if (res.status === 409 && data?.error === "USERNAME_TAKEN") {
          toast.error("Username is already taken. Please choose another.");
          return;
        }
        if (res.status === 403 && data?.error === "USERNAME_RESERVED") {
          toast.error("This username is reserved for core team members.");
          return;
        }
        throw new Error(data.error || "Failed to update profile");
      }

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: fullName,
          username: normalizedUsername,
          image: avatar,
        },
      });

      toast.success("Profile successfully updated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
                <User className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Account Settings</h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage your account profile and preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form Card */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-border">
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Profile Information</h2>
                <p className="text-muted-foreground text-sm">
                  Update your personal information and profile picture
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 space-y-6">
                  {/* Profile Picture Section */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
                      Profile Picture
                    </label>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                      <div className="relative">
                        <div className={`w-20 h-20 rounded-full shadow-lg overflow-hidden flex items-center justify-center ${(!avatar || isLoadingAvatar) ? 'bg-gradient-to-br from-primary/30 to-primary/60' : ''}`}>
                          {avatar ? (
                            isLoadingAvatar ? (
                              <Skeleton className="w-full h-full rounded-full" />
                            ) : signedAvatarUrl ? (
                              <img
                                src={signedAvatarUrl}
                                alt="Avatar Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Hide broken image and show fallback
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              // Fallback to original avatar URL if signed URL fails
                              <img
                                src={avatar}
                                alt="Avatar Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            )
                          ) : null}
                          <span className={`avatar-fallback text-3xl font-bold text-white absolute inset-0 flex items-center justify-center ${(avatar && !isLoadingAvatar) ? 'hidden' : ''}`}>
                            {(fullName?.charAt(0) || session?.user?.email?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        </div>
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full sm:w-auto bg-gray-800 text-white dark:bg-gradient-to-r dark:from-zinc-600/50 dark:to-zinc-700/50 px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:from-zinc-700/50 dark:hover:to-zinc-800/50 text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {isUploading ? "Uploading..." : "Upload Image"}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          JPG, PNG. Max 5MB. Recommended: 200x200px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full Name Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500 focus:border-transparent transition-all border-gray-300 dark:border-zinc-800/50 bg-gray-50 dark:bg-black/20"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This is how your name will appear to other users
                    </p>
                  </div>

                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className={`w-full pl-10 pr-3 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500 focus:border-transparent transition-all ${username && !usernameValidation.isValid
                          ? 'border-red-500 bg-red-50 dark:bg-zinc-800/20'
                          : 'border-gray-300 dark:border-zinc-800/50 bg-gray-50 dark:bg-black/20'
                          }`}
                        placeholder="Choose a username"
                      />
                    </div>

                    {username && (
                      <>
                        {!usernameValidation.isValid ? (
                          <div className="mt-2 text-sm text-red-600 dark:text-zinc-400">
                            {usernameValidation.message}
                          </div>
                        ) : usernameAvailability.status !== "idle" ? (
                          <div className="mt-2 text-sm">
                            {usernameAvailability.status === "checking" ? (
                              <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Checking availability...
                              </span>
                            ) : usernameAvailability.status === "available" ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {usernameAvailability.message}
                              </span>
                            ) : (
                              <span className={usernameAvailability.status === "taken"
                                ? "text-red-600 dark:text-red-400"
                                : "text-red-600 dark:text-zinc-400"
                              }>
                                {usernameAvailability.message}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="mt-3 p-4 bg-transparent dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                      <p className="text-xs font-medium text-foreground mb-2">Username Requirements:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${username.length >= 3 ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}></div>
                          3-20 characters
                        </li>
                        <li className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${/^[a-z]/.test(username) ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}></div>
                          Must start with a letter
                        </li>
                        <li className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${/^[a-z0-9]+$/.test(username) ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}></div>
                          Lowercase letters and numbers only
                        </li>
                        <li className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${!username.includes(' ') ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}></div>
                          No spaces or special characters
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-transparent dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Profile Visibility</h3>
                        <p className="text-sm text-muted-foreground">
                          Your username and profile picture are public. Choose information you're comfortable sharing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 border-t border-gray-200 dark:border-zinc-800/30 flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      isUploading ||
                      !hasChanges ||
                      !usernameValidation.isValid ||
                      usernameAvailability.status === "taken" ||
                      usernameAvailability.status === "checking"
                    }
                    className="bg-gray-800 text-white dark:bg-gradient-to-r dark:from-zinc-600 dark:to-zinc-700 px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:from-zinc-700 dark:hover:to-zinc-800 text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {hasChanges ? 'Save Changes' : 'No Changes'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Tips */}
              <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
                <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                  <h3 className="text-lg font-bold text-foreground mb-2">Profile Tips</h3>
                  <p className="text-muted-foreground text-sm">Create a great profile</p>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Use a clear photo</h4>
                      <p className="text-xs text-muted-foreground mt-1">A good profile picture helps build trust</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Choose a unique username</h4>
                      <p className="text-xs text-muted-foreground mt-1">Make it memorable and easy to find</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Keep it professional</h4>
                      <p className="text-xs text-muted-foreground mt-1">Your profile represents you online</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Be consistent</h4>
                      <p className="text-xs text-muted-foreground mt-1">Use the same name across platforms</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
                <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                  <h3 className="text-lg font-bold text-foreground mb-2">Account Security</h3>
                  <p className="text-muted-foreground text-sm">Keep your account safe</p>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Profile Privacy</h4>
                      <p className="text-xs text-muted-foreground">Your username is publicly visible</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Secure Account</h4>
                      <p className="text-xs text-muted-foreground">Use strong passwords and 2FA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Regular Updates</h4>
                      <p className="text-xs text-muted-foreground">Keep your profile information current</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="mt-6 bg-red-50 dark:bg-zinc-800/20 rounded-xl md:rounded-2xl shadow-sm border border-red-200 dark:border-zinc-700/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-red-800 dark:text-zinc-300">Delete Account</h3>
                  <p className="text-sm text-red-700 dark:text-zinc-200 mt-1">
                    Permanently delete your account and all associated data. This action is irreversible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-4 md:mt-6 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 p-4 md:p-6 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-foreground mb-1">Need Help?</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Having trouble with your account settings? Our support team is here to help.
                </p>
              </div>
              <button
                onClick={() => window.open("https://sirath.network/contact", "_blank")}
                className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onCloseAction={() => setIsDeleteModalOpen(false)}
      />

      {showCropModal && (
        <ImageCropModal
          imageSrc={tempImageSrc}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}