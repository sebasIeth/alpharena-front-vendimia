"use client";

import { useState, useEffect } from "react";

export interface CountdownValue {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isLive: boolean;
}

function getTimeLeft(target: Date): CountdownValue {
  const diff = target.getTime() - Date.now();
  if (diff <= 0)
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isLive: true };

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalSeconds: Math.floor(diff / 1000),
    isLive: false,
  };
}

export function useCountdown(targetDate: Date): CountdownValue {
  const [timeLeft, setTimeLeft] = useState<CountdownValue>(
    getTimeLeft(targetDate)
  );

  const targetTime = targetDate.getTime();

  useEffect(() => {
    const target = new Date(targetTime);
    setTimeLeft(getTimeLeft(target));
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return timeLeft;
}
