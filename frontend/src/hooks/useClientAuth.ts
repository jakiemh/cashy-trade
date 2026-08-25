"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";

export function useClientAuth() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
    setReady(true);
  }, []);

  return { ready, authed };
}
