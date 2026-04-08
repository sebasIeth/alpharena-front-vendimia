"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  // Capture ?ref= from URL into localStorage
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("pendingReferralCode", ref);
    }
  }, [searchParams]);

  // After login, auto-register pending referral
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = localStorage.getItem("pendingReferralCode");
    if (!pending) return;

    api
      .registerReferral(pending)
      .then(() => {
        localStorage.removeItem("pendingReferralCode");
      })
      .catch(() => {
        // Already registered or invalid code — clean up silently
        localStorage.removeItem("pendingReferralCode");
      });
  }, [isAuthenticated]);

  return null;
}
