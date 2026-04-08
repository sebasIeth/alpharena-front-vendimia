"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  // Capture ?ref= from URL into localStorage (only if not already referred)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && !localStorage.getItem("referralRegistered")) {
      localStorage.setItem("pendingReferralCode", ref);
    }
  }, [searchParams]);

  // After login, auto-register pending referral
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = localStorage.getItem("pendingReferralCode");
    if (!pending) return;
    // Skip if already registered in a previous session
    if (localStorage.getItem("referralRegistered")) {
      localStorage.removeItem("pendingReferralCode");
      return;
    }

    api
      .registerReferral(pending)
      .then(() => {
        localStorage.removeItem("pendingReferralCode");
        localStorage.setItem("referralRegistered", "true");
      })
      .catch(() => {
        // Already registered or invalid code — clean up silently
        localStorage.removeItem("pendingReferralCode");
        // Mark as registered so we don't keep retrying
        localStorage.setItem("referralRegistered", "true");
      });
  }, [isAuthenticated]);

  return null;
}
