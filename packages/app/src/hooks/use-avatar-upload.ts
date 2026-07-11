"use client";

import { useMutation } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

const AVATARS_BUCKET = "avatars";

function extensionFromUri(uri: string, fallback: string) {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return match?.[1]?.toLowerCase() ?? fallback;
}

/**
 * Uploads a locally-picked image (a `file://`/`content://`/blob URI from
 * expo-image-picker) to the public `avatars` storage bucket and returns its
 * public URL. Unlike event images, avatars are replaced rather than
 * accumulated, so this always writes to the same per-user path (`upsert:
 * true`) — the "avatars: users upload/update own" storage policies (see
 * 20260711000002_avatar_storage.sql) only allow writing under a folder named
 * after the caller's own auth.uid(), which this enforces by construction.
 */
export function useUploadAvatar() {
  const supabase = useSupabase();
  const { user } = useSession();

  return useMutation({
    mutationFn: async ({
      uri,
      contentType = "image/jpeg",
    }: {
      uri: string;
      contentType?: string;
    }) => {
      if (!user) throw new Error("Not signed in");

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const ext = extensionFromUri(uri, "jpg");
      const path = `${user.id}/avatar.${ext}`;

      const { error } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, arrayBuffer, { contentType, upsert: true });
      if (error) throw error;

      const { data } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(path);
      // Cache-bust: the path is stable across uploads, so append a fresh
      // query param or the old image would keep showing from cache.
      return `${data.publicUrl}?v=${Date.now()}`;
    },
  });
}
