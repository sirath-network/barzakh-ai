"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Image as ImageIcon, AtSign, Save, Upload, X, RotateCcw, Trash2 } from "lucide-react";
import DeleteAccountModal from "./delete-account-modal";

// Image Crop Modal Component (No changes needed here as it's a modal overlay)
function ImageCropModal({
  imageSrc,
  onSave,
  onCancel
}: {
  imageSrc: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(200);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ size: 200, mouseY: 0 });

  const CANVAS_SIZE = 350;
  const MIN_CROP_SIZE = 50;
  const MAX_CROP_SIZE = Math.min(CANVAS_SIZE * 0.9, 300);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageElement(img);
      setImagePosition({ x: 0, y: 0 });
      setCropSize(Math.min(200, MAX_CROP_SIZE));
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageElement && canvasRef.current) {
      drawCanvas();
    }
  }, [imageElement, imagePosition, scale, cropSize]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageElement) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const aspectRatio = imageElement.width / imageElement.height;
    let baseWidth, baseHeight;

    if (aspectRatio > 1) {
      baseWidth = CANVAS_SIZE * 0.8;
      baseHeight = baseWidth / aspectRatio;
    } else {
      baseHeight = CANVAS_SIZE * 0.8;
      baseWidth = baseHeight * aspectRatio;
    }

    const displayWidth = baseWidth * scale;
    const displayHeight = baseHeight * scale;

    const imageX = (CANVAS_SIZE - displayWidth) / 2 + imagePosition.x;
    const imageY = (CANVAS_SIZE - displayHeight) / 2 + imagePosition.y;

    ctx.drawImage(imageElement, imageX, imageY, displayWidth, displayHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cropX = (CANVAS_SIZE - cropSize) / 2;
    const cropY = (CANVAS_SIZE - cropSize) / 2;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cropX + cropSize/2, cropY + cropSize/2, cropSize/2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cropX + cropSize/2, cropY + cropSize/2, cropSize/2, 0, Math.PI * 2);
    ctx.stroke();

    const handleSize = 8;
    const handles = [
      { x: cropX + cropSize - handleSize, y: cropY + cropSize - handleSize },
    ];

    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const isInResizeHandle = (mousePos: { x: number, y: number }) => {
    const cropX = (CANVAS_SIZE - cropSize) / 2;
    const cropY = (CANVAS_SIZE - cropSize) / 2;
    const handleSize = 8;
    const handleX = cropX + cropSize - handleSize;
    const handleY = cropY + cropSize - handleSize;

    return mousePos.x >= handleX && mousePos.x <= handleX + handleSize &&
           mousePos.y >= handleY && mousePos.y <= handleY + handleSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);

    if (isInResizeHandle(mousePos)) {
      setIsResizing(true);
      setResizeStart({ size: cropSize, mouseY: mousePos.y });
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);

    const canvas = canvasRef.current;
    if (canvas) {
      if (isInResizeHandle(mousePos)) {
        canvas.style.cursor = 'se-resize';
      } else {
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    }

    if (isResizing) {
      const deltaY = mousePos.y - resizeStart.mouseY;
      const newSize = Math.max(MIN_CROP_SIZE, Math.min(MAX_CROP_SIZE, resizeStart.size + deltaY * 2));
      setCropSize(newSize);
    } else if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setImagePosition(prev => ({
        x: prev.x + deltaX * 0.5,
        y: prev.y + deltaY * 0.5
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleSave = () => {
    if (!imageElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputSize = 200;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const aspectRatio = imageElement.width / imageElement.height;
    let baseWidth, baseHeight;

    if (aspectRatio > 1) {
      baseWidth = CANVAS_SIZE * 0.8;
      baseHeight = baseWidth / aspectRatio;
    } else {
      baseHeight = CANVAS_SIZE * 0.8;
      baseWidth = baseHeight * aspectRatio;
    }

    const displayWidth = baseWidth * scale;
    const displayHeight = baseHeight * scale;

    const imageX = (CANVAS_SIZE - displayWidth) / 2 + imagePosition.x;
    const imageY = (CANVAS_SIZE - displayHeight) / 2 + imagePosition.y;

    const cropCenterX = CANVAS_SIZE / 2;
    const cropCenterY = CANVAS_SIZE / 2;
    const cropRadius = cropSize / 2;

    const cropLeft = cropCenterX - cropRadius - imageX;
    const cropTop = cropCenterY - cropRadius - imageY;
    const cropDisplaySize = cropSize;

    const scaleToOriginal = imageElement.width / (baseWidth * scale);
    const sourceX = Math.max(0, cropLeft * scaleToOriginal);
    const sourceY = Math.max(0, cropTop * scaleToOriginal);
    const sourceSize = cropDisplaySize * scaleToOriginal;

    ctx.beginPath();
    ctx.arc(outputSize/2, outputSize/2, outputSize/2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      imageElement,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, outputSize, outputSize
    );

    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedImage);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 rounded-xl p-4 max-w-md w-full border border-red-900/30 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Crop Image</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-red-900/20 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          <div ref={containerRef} className="relative bg-gray-900/50 rounded-lg p-2">
            <canvas
              ref={canvasRef}
              className="w-full border border-red-900/30 rounded cursor-grab"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Zoom: {Math.round(scale * 100)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-red-900/30 rounded appearance-none cursor-pointer slider"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Size: {Math.round(cropSize)}px
              </label>
              <input
                type="range"
                min={MIN_CROP_SIZE}
                max={MAX_CROP_SIZE}
                step="5"
                value={cropSize}
                onChange={(e) => setCropSize(parseInt(e.target.value))}
                className="w-full h-1 bg-red-900/30 rounded appearance-none cursor-pointer slider"
              />
            </div>
          </div>
          <div className="text-xs text-gray-400 text-center">
            Drag image to reposition • Drag corner handle or use slider to resize
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setScale(1);
                setImagePosition({ x: 0, y: 0 });
                setCropSize(200);
              }}
              className="flex-1 bg-gray-600/30 hover:bg-gray-600/50 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

      setAvatar(data.url);
      toast.success("Avatar updated! Save changes to apply.");
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
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-8 border-b border-gray-200 dark:border-red-900/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-red-800/50 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50">
                    <User className="w-6 h-6 text-gray-600 dark:text-red-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Account Profile
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                      Update your public profile information.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 space-y-2 flex flex-col items-center">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Profile Picture
                    </label>
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-2 border-gray-200 dark:border-red-900/50 shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={avatar || "https://avatar.vercel.sh/fallback.png"}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
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
                      className="w-full mt-4 bg-gray-800 text-white dark:bg-gradient-to-r dark:from-red-600/50 dark:to-red-700/50 px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:from-red-700/50 dark:hover:to-red-800/50 text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-gray-300 dark:border-red-900/50 bg-gray-50 dark:bg-black/20"
                          placeholder="Satoshi Nakamoto"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        Username
                      </label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all border-gray-300 dark:border-red-900/50 bg-gray-50 dark:bg-black/20"
                          placeholder="username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || isUploading || !hasChanges}
                  className="bg-gray-800 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:from-red-700 dark:hover:to-red-800 text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            </div>
          </form>

          <div className="mt-8 bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden">
            <div className="p-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Delete Account
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Permanently delete your account and all associated data. This action is irreversible.
                </p>
                <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold transition-all duration-200 shadow-lg flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {showCropModal && (
        <ImageCropModal
          imageSrc={tempImageSrc}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </>
  );
}