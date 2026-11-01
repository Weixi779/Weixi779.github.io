// Created by weixi on 2026/10/31.
import { useEffect, useState } from 'react';

const day = 24 * 60 * 60 * 1000;
const shanghaiOffset = 8 * 60 * 60 * 1000;
// Use the site's calendar day, independent of the build machine or reader's zone.
export function timelineToday(now = Date.now()) {
  return new Date(now + shanghaiOffset).toISOString().slice(0, 10);
}

export function useTimelineDate(initialDate: string) {
  const [date, setDate] = useState(initialDate);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setDate(timelineToday());
      const untilMidnight = day - (Date.now() + shanghaiOffset) % day;
      timer = setTimeout(refresh, untilMidnight + 1);
    };
    const resume = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);
  return date;
}
