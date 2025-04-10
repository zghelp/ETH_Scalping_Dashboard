'use client'; // Required for useEffect, useState, useRef

import React, { useEffect, useRef, memo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, CandlestickData, UTCTimestamp, LineStyle, ColorType } from 'lightweight-charts';
import { CandleData } from '@/lib/types'; // Assuming CandleData has the necessary fields

interface IndicatorChartProps {
  data: CandleData[] | null | undefined;
}

// Helper to format data for lightweight-charts
const formatChartData = (candle: CandleData): CandlestickData => ({
  time: (candle.timestamp / 1000) as UTCTimestamp, // Cast to expected type
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
});

const formatLineData = (time: number, value: number | null | undefined): LineData | null => {
    if (value === null || value === undefined) return null;
    return { time: (time / 1000) as UTCTimestamp, value }; // Cast to expected type
};

const IndicatorChart: React.FC<IndicatorChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema5SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema10SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // --- Create or Update Chart ---
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400, // Adjust height as needed
        layout: {
          background: { type: ColorType.Solid, color: '#1f2937' }, // bg-gray-800
          textColor: '#d1d5db', // text-gray-300
        },
        grid: {
          vertLines: { color: '#374151' }, // gray-700
          horzLines: { color: '#374151' }, // gray-700
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
         // Handle resizing
         handleScale: true,
         handleScroll: true,
      });

      // Candlestick Series
      candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#10b981', // green-500
        downColor: '#ef4444', // red-500
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
      });

      // EMA5 Series
      ema5SeriesRef.current = chartRef.current.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'EMA5' }); // blue-500
      // EMA10 Series
      ema10SeriesRef.current = chartRef.current.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'EMA10' }); // amber-500
      // BB Upper Series
      bbUpperSeriesRef.current = chartRef.current.addLineSeries({ color: '#a78bfa', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Up' }); // violet-400
      // BB Middle Series
      bbMiddleSeriesRef.current = chartRef.current.addLineSeries({ color: '#a78bfa', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'BB Mid' }); // violet-400
      // BB Lower Series
      bbLowerSeriesRef.current = chartRef.current.addLineSeries({ color: '#a78bfa', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Low' }); // violet-400

    }

    // --- Prepare Data ---
    const candleData = data.map(formatChartData);
    const ema5Data = data.map(d => formatLineData(d.timestamp, d.EMA5)).filter(d => d !== null) as LineData[];
    const ema10Data = data.map(d => formatLineData(d.timestamp, d.EMA10)).filter(d => d !== null) as LineData[];
    const bbUpperData = data.map(d => formatLineData(d.timestamp, d.BB_Upper)).filter(d => d !== null) as LineData[];
    const bbMiddleData = data.map(d => formatLineData(d.timestamp, d.BB_Middle)).filter(d => d !== null) as LineData[];
    const bbLowerData = data.map(d => formatLineData(d.timestamp, d.BB_Lower)).filter(d => d !== null) as LineData[];


    // --- Set Data on Series ---
    candlestickSeriesRef.current?.setData(candleData);
    ema5SeriesRef.current?.setData(ema5Data);
    ema10SeriesRef.current?.setData(ema10Data);
    bbUpperSeriesRef.current?.setData(bbUpperData);
    bbMiddleSeriesRef.current?.setData(bbMiddleData);
    bbLowerSeriesRef.current?.setData(bbLowerData);

    // Auto-fit view initially or on data change
    // chartRef.current?.timeScale().fitContent();

    // --- Resize Handler ---
     const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };

    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      // Don't remove the chart on every data update, only on component unmount
      // chartRef.current?.remove();
      // chartRef.current = null;
    };
  }, [data]); // Re-run effect when data changes

   // Cleanup chart on component unmount
   useEffect(() => {
        return () => {
            chartRef.current?.remove();
            chartRef.current = null;
        };
    }, []);


  return <div ref={chartContainerRef} className="w-full h-[400px]" />; // Container for the chart
};

// Memoize the component to prevent unnecessary re-renders if props haven't changed
export default memo(IndicatorChart);
