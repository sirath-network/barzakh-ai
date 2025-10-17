"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";

export default function DeleteAccountModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmationText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account.");
      }

      toast.success("Account deleted successfully.");
      await signOut({ redirect: false });
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 rounded-xl p-6 max-w-md w-full border border-red-900/50 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Delete Account
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-900/20 rounded-md transition-colors"
            disabled={isDeleting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            This action is irreversible. All your data, including chats,
            documents, and settings, will be permanently deleted.
          </p>
          <p className="text-sm text-gray-300">
            Please type <strong className="text-red-400">DELETE</strong> to
            confirm.
          </p>
          <div>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-gray-700 bg-black/20"
              placeholder="DELETE"
              disabled={isDeleting}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm transition-colors text-white bg-gray-600/50 hover:bg-gray-600/70"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmationText !== "DELETE" || isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
