"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { authRequest } from "@/app/lib/api";

// Resize an image file to a max dimension and return a WebP Blob.
async function resizeToWebp(file, maxDim = 512, quality = 0.85) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return new Promise((res) => canvas.toBlob(res, "image/webp", quality));
}

// Props:
//   value: current photo_url (string)
//   onChange(url): called with the new public URL after upload
export default function PhotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      // 1. resize + convert to webp
      const blob = await resizeToWebp(file);
      // 2. get a presigned URL from the backend
      const { data } = await authRequest.get("/profiles/photo/presign", {
        params: { content_type: "image/webp" },
      });
      // 3. upload directly to S3 (no auth header — the signature authorizes it)
      const put = await fetch(data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: blob,
      });
      if (!put.ok) throw new Error("upload failed");
      // 4. hand the permanent public URL back to the form
      onChange(data.public_url);
    } catch (err) {
      setError("Couldn't upload that image. Please try another.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        Profile photo (optional)
      </span>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera size={20} className="text-slate-400" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-blue hover:border-slate-300 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>{value ? "Change photo" : "Upload photo"}</>
            )}
          </button>
          <p className="mt-1 text-[11px] text-slate-400">JPG, PNG or WebP</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
