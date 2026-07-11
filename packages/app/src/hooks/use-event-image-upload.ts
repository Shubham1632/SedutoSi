"use client";

import { useMutation } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

const EVENT_IMAGES_BUCKET = "event-images";

function extensionFromUri(uri: string, fallback: string) {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return match?.[1]?.toLowerCase() ?? fallback;
}

export function useUploadEventImage() {
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
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from(EVENT_IMAGES_BUCKET)
        .upload(path, arrayBuffer, { contentType, upsert: false });
      if (error) throw error;

      const { data } = supabase.storage
        .from(EVENT_IMAGES_BUCKET)
        .getPublicUrl(path);
      return data.publicUrl;
    },
  });
}
