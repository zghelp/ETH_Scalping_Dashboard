import Head from 'next/head';
import useSWR from 'swr';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link'; // Import Link
import SignalCard from '@/components/SignalCard';
import SignalDecision from '@/components/SignalDecision';
// IndicatorChart import removed
import type { SignalProps } from '@/lib/types';

const fetcher = (url: string): Promise<SignalProps> => fetch(url).then(res => {
    if (!res.ok) {
        // Try to parse error details from Gate.io if possible
        return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
        });
    }
    return res.json();
});

export default function Home() {
  // --- Hooks must be called at the top level ---
  const [prevScores, setPrevScores] = useState({ long: 0, short: 0 });
  const audioRef = useRef<HTMLAudioElement>(null); // Ref for audio element
  const notificationThreshold = 8; // Trigger notification if score >= 8

  // Use the SignalProps type with useSWR for better type safety
  const { data, isLoading, error } = useSWR<SignalProps>('/api/signal', fetcher, {
    refreshInterval: 60000 // Refresh every 60 seconds
  });

  // --- Notification Effect Logic ---
  useEffect(() => {
    // Request permission on component mount if needed
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    if (data?.opening_signal) {
      const currentLong = data.opening_signal.long_score;
      const currentShort = data.opening_signal.short_score;

      let notificationTitle = '';
      let notificationBody = '';

      // Check for Long signal crossing threshold
      if (currentLong >= notificationThreshold && prevScores.long < notificationThreshold) {
        notificationTitle = `🚀 高分做多信号! (${currentLong}/10)`;
        notificationBody = data.opening_signal.long_reasons?.join(', ') || '查看详情';
      }
      // Check for Short signal crossing threshold
      else if (currentShort >= notificationThreshold && prevScores.short < notificationThreshold) {
        notificationTitle = `📉 高分做空信号! (${currentShort}/10)`;
        notificationBody = data.opening_signal.short_reasons?.join(', ') || '查看详情';
      }

      // If notification should be sent
      if (notificationTitle) {
        // Play sound
        audioRef.current?.play().catch(e => console.error("Error playing sound:", e));

        // Show browser notification
        if (typeof window !== 'undefined' && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(notificationTitle, { body: notificationBody, icon: '/favicon.ico' }); // Use your favicon
            } else if (Notification.permission === "default") {
                 // User hasn't explicitly denied, maybe prompt again or log
                 console.log("Notification permission was default, user might need to allow.");
            } else {
                 console.log("Notification permission denied.");
            }
        } else {
            console.log("Browser does not support desktop notification");
        }
      }

      // Update previous scores if they changed
      if(currentLong !== prevScores.long || currentShort !== prevScores.short) {
        setPrevScores({ long: currentLong, short: currentShort });
      }
    }
  }, [data, prevScores.long, prevScores.short]); // Depend on data and previous scores

  // --- Conditional returns for loading/error states ---
  if (error) return <div className="p-4 text-center text-red-500">加载信号时出错: {error.message}</div>;
  // Show loading state but hooks are already called
  if (!data && isLoading) return <div className="p-4 text-center text-gray-500">加载中...</div>;
  // Handle case where data might be fetched but is empty/invalid
  if (!data) return <div className="p-4 text-center text-gray-500">无法获取信号数据。</div>;

  // Log the data received from useSWR to check market_context
  // console.log("Home component received data:", data);

  // --- Render Page ---
  return (
    // Remove 'dark' class and background classes, handled by body style now
    <div className="min-h-screen py-8 px-4">
      <Head>
        <title>ETH Scalping 策略助手</title>
      </Head>
      {/* Adjust max-width to accommodate wider card */}
      <main className="max-w-3xl mx-auto">
        {/* Set default text color for dark theme */}
        <div className="flex justify-center items-center mb-4 relative">
             <h1 className="text-2xl font-bold text-center text-gray-100">🚀 ETH Scalping 策略助手</h1>
             {/* Add link to history page */}
             <Link href="/history" className="absolute right-0 text-sm text-blue-400 hover:text-blue-300">
                 查看历史 &rarr;
             </Link>
        </div>

        {/* Pass data to SignalDecision based on its updated Props */}
        <SignalDecision
            opening_signal={data.opening_signal ?? null}
            holdability_score={data.holdability_score ?? null}
            holdability_details={data.holdability_details ?? null}
            position={data.position ?? null}
            market_context={data.market_context ?? null}
        />

        {/* Pass the entire data object or specific parts according to SignalProps */}
        <SignalCard
          time={data.time}
          price={data.price}
          opening_signal={data.opening_signal}
          holdability_score={data.holdability_score}
          holdability_details={data.holdability_details}
          position={data.position}
          indicators_1m={data.indicators_1m}
          indicators_15m={data.indicators_15m}
          market_context={data.market_context} // Pass market_context here
          // Pass loading and error states from useSWR
          isLoading={isLoading}
          error={error}
          // Pass recommendation if it's part of the data structure
          // recommendation={data.recommendation}
          // recommendation={data.recommendation}
          // recommendationReasons={data.recommendationReasons}
        />

        {/* Remove the Indicator Chart */}
        {/* <div className="mt-6">
          <IndicatorChart data={data.historical_data_1m} />
        </div> */}

        <p className="text-center text-xs text-gray-400 mt-6">每 60 秒自动刷新 | Powered by Gate.io API</p>

        {/* Hidden Audio Element for Notifications */}
        {/* Ensure you have a sound file at /public/notification.mp3 */}
        <audio ref={audioRef} src="/notification.mp3" preload="auto"></audio>
      </main>
    </div>
  )
}
