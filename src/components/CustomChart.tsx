/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FuelLog } from '../types';

interface CustomChartProps {
  logs: FuelLog[];
}

export default function CustomChart({ logs }: CustomChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    odo: number;
    avg: number;
    method: string;
    index: number;
  } | null>(null);

  // Filter logs that have a calculated average
  const validPoints = logs
    .filter(log => log.calculatedAverage !== null && log.calculatedAverage !== undefined)
    .sort((a, b) => a.currentOdo - b.currentOdo)
    .map(log => ({
      date: log.date,
      odo: log.currentOdo,
      avg: log.calculatedAverage as number,
      method: log.isStandaloneAverage ? 'Manual Standalone' : log.trackingMethod
    }));

  if (validPoints.length < 2) {
    return (
      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 p-4">
        <p className="font-mono text-xs text-zinc-500 text-center">
          At least 2 mileage checkpoints needed to generate trend chart.
        </p>
        <span className="font-mono text-[10px] text-zinc-600 mt-1">
          (Averages compute after establishing a baseline ODO)
        </span>
      </div>
    );
  }

  // Find min/max values to scale the SVG
  const minOdo = validPoints[0].odo;
  const maxOdo = validPoints[validPoints.length - 1].odo || minOdo + 100;
  const odoRange = maxOdo - minOdo === 0 ? 100 : maxOdo - minOdo;

  const minAvg = Math.min(...validPoints.map(p => p.avg));
  const maxAvg = Math.max(...validPoints.map(p => p.avg));
  const paddingBuffer = (maxAvg - minAvg) * 0.15 || 5;
  const graphMinAvg = Math.max(0, minAvg - paddingBuffer);
  const graphMaxAvg = maxAvg + paddingBuffer;
  const avgRange = graphMaxAvg - graphMinAvg;

  // SVG grid settings
  const width = 500;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Convert custom coordinates to SVG space
  const getX = (odo: number) => {
    const ratio = (odo - minOdo) / odoRange;
    return paddingLeft + ratio * chartWidth;
  };

  const getY = (avg: number) => {
    const ratio = (avg - graphMinAvg) / avgRange;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Construct SVG Path
  let dPath = '';
  const coords = validPoints.map((p, idx) => ({
    cx: getX(p.odo),
    cy: getY(p.avg),
    ...p,
    index: idx
  }));

  coords.forEach((coord, i) => {
    if (i === 0) {
      dPath += `M ${coord.cx} ${coord.cy}`;
    } else {
      // Draw standard line or bezier curve
      dPath += ` L ${coord.cx} ${coord.cy}`;
    }
  });

  // Grid lines
  const gridLinesCount = 4;
  const yGrids = Array.from({ length: gridLinesCount }, (_, i) => {
    const value = graphMinAvg + (avgRange / (gridLinesCount - 1)) * i;
    return {
      y: getY(value),
      value: value.toFixed(1)
    };
  });

  const xGrids = coords.length <= 5 
    ? coords 
    : [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]];

  return (
    <div className="relative border border-[#2A2D35] bg-[#16181D] p-4 shadow-xl rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#E0E0E0] font-mono">
            Fuel Efficiency Trend
          </h3>
          <p className="text-[10px] text-[#888D96] font-mono">
            km/L plotted across Odometer (km) increments
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-[#FF5C00] inline-block"></span>
            <span className="text-[#888D96]">KM/L INDEX</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {yGrids.map((g, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={g.y}
                x2={width - paddingRight}
                y2={g.y}
                stroke="#2A2D35"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={g.y + 4}
                fill="#888D96"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
              >
                {g.value}
              </text>
            </g>
          ))}

          {/* X Axis labels */}
          {xGrids.map((g, idx) => (
            <g key={idx}>
              <text
                x={getX(g.odo)}
                y={height - 12}
                fill="#888D96"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {g.odo}
              </text>
            </g>
          ))}

          {/* Fill under line */}
          {coords.length > 0 && (
            <path
              d={`${dPath} L ${getX(validPoints[validPoints.length - 1].odo)} ${getY(graphMinAvg)} L ${getX(validPoints[0].odo)} ${getY(graphMinAvg)} Z`}
              fill="url(#gradient-mileage)"
              opacity="0.1"
            />
          )}

          {/* Main trend line */}
          <path
            d={dPath}
            fill="none"
            stroke="#FF5C00" // Neon Brand Orange
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive data points */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={hoveredPoint?.index === i ? "6" : "4"}
              fill="#16181D"
              stroke={hoveredPoint?.index === i ? "#FFFFFF" : "#FF5C00"}
              strokeWidth="2.5"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Gradients declaration */}
          <defs>
            <linearGradient id="gradient-mileage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5C00" />
              <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Dynamic Interactive Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 pointer-events-none rounded border border-[#2A2D35] bg-[#0A0B0D] p-2 shadow-2xl text-[10px] uppercase font-mono max-w-[150px]"
            style={{
              left: `${Math.min(
                Math.max((hoveredPoint.cx / width) * 100 - 15, 2),
                80
              )}%`,
              top: `${Math.max((hoveredPoint.cy / height) * 100 - 45, 2)}%`,
            }}
          >
            <div className="text-[9px] text-[#888D96] mb-0.5">{hoveredPoint.date}</div>
            <div className="font-bold text-[#E0E0E0]">ODO: {hoveredPoint.odo} km</div>
            <div className="font-bold text-[#FF5C00]">AVG: {hoveredPoint.avg} km/L</div>
            <div className="text-[8px] text-[#888D96] mt-0.5 lowercase text-ellipsis overflow-hidden whitespace-nowrap">
              {hoveredPoint.method}
            </div>
          </div>
        )}
      </div>

      {/* Stats Quick Footer */}
      <div className="mt-2 text-[10px] text-[#888D96] border-t border-[#2A2D35] pt-2 flex justify-between font-mono">
        <span>Min: <b className="text-[#E0E0E0]">{minAvg.toFixed(1)} km/L</b></span>
        <span>Max: <b className="text-[#E0E0E0]">{maxAvg.toFixed(1)} km/L</b></span>
        <span>Run span: <b className="text-[#E0E0E0]">{(maxOdo - minOdo)} km</b></span>
      </div>
    </div>
  );
}
