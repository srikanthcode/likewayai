"use client";

import { useEffect } from "react";

/** Ensures a stable anonymous user id exists in localStorage for API calls. */
export default function AuthInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("gemma_userId")) {
      localStorage.setItem(
        "gemma_userId",
        `user_${Math.random().toString(36).slice(2, 11)}`
      );
    }
  }, []);

  return null;
}
