import React, { useState } from "react";
import { VisualDiagram } from "../types";
import { Layers, ArrowRight, RefreshCw, Compass, CheckCircle2 } from "lucide-react";

/**
 * Picture-based architectural illustrations for Strengthen IO.
 * Designed in the Charcoal Grey, Navy Blue, and Olive Green theme without emojis.
 */
export const CourseCoverPicture: React.FC<{
  category?: string;
  title?: string;
  className?: string;
}> = ({ category = "tech", title = "", className = "h-44 w-full" }) => {
  const normalized = category.toLowerCase();

  return (
    <div
      className={`relative overflow-hidden bg-[#16243e] border-b border-[#2c4470]/60 select-none ${className}`}
    >
      {/* Architectural Grid Backdrop */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 600 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`bg-${normalized}`} x1="0" y1="0" x2="600" y2="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16243e" />
            <stop offset="55%" stopColor="#1d2f50" />
            <stop offset="100%" stopColor="#181b20" />
          </linearGradient>
          <pattern id="arch-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="600" height="260" fill={`url(#bg-${normalized})`} />
        <rect width="600" height="260" fill="url(#arch-grid)" />

        {normalized.includes("finance") || normalized.includes("tax") ? (
          <g>
            {/* Financial Ledger & Tax Architecture */}
            <rect x="55" y="45" width="210" height="170" rx="6" fill="#181b20" fillOpacity="0.85" stroke="#2c4470" strokeWidth="1.5" />
            <line x1="75" y1="75" x2="180" y2="75" stroke="#84ab35" strokeWidth="3" />
            <line x1="75" y1="100" x2="235" y2="100" stroke="#7d8796" strokeOpacity="0.5" strokeWidth="2" />
            <line x1="75" y1="122" x2="215" y2="122" stroke="#7d8796" strokeOpacity="0.5" strokeWidth="2" />
            <line x1="75" y1="144" x2="240" y2="144" stroke="#7d8796" strokeOpacity="0.5" strokeWidth="2" />
            {/* Bar chart ascending in Olive Green & Navy */}
            <rect x="320" y="145" width="34" height="70" rx="3" fill="#2c4470" />
            <rect x="372" y="115" width="34" height="100" rx="3" fill="#4b631c" />
            <rect x="424" y="82" width="34" height="133" rx="3" fill="#6b8e23" />
            <rect x="476" y="48" width="34" height="167" rx="3" fill="#84ab35" />
            <path d="M315 135 L385 95 L440 70 L500 35" stroke="#f3f5f7" strokeWidth="2" strokeDasharray="4 4" />
          </g>
        ) : normalized.includes("ai") || normalized.includes("rag") ? (
          <g>
            {/* Vector & RAG Retrieval Pipeline */}
            <circle cx="130" cy="130" r="52" fill="#181b20" stroke="#6b8e23" strokeWidth="2" />
            <circle cx="130" cy="130" r="24" fill="#6b8e23" fillOpacity="0.25" stroke="#84ab35" strokeWidth="1.5" />
            <path d="M182 130 L268 85 M182 130 L268 130 M182 130 L268 175" stroke="#84ab35" strokeWidth="1.5" />
            <rect x="268" y="65" width="110" height="36" rx="4" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <rect x="268" y="112" width="110" height="36" rx="4" fill="#181b20" stroke="#6b8e23" strokeWidth="1.5" />
            <rect x="268" y="159" width="110" height="36" rx="4" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <path d="M378 83 L445 130 M378 130 L445 130 M378 177 L445 130" stroke="#7d8796" strokeWidth="1.5" />
            <rect x="445" y="92" width="105" height="76" rx="6" fill="#1e3154" stroke="#84ab35" strokeWidth="2" />
            <line x1="465" y1="118" x2="530" y2="118" stroke="#f3f5f7" strokeWidth="2" />
            <line x1="465" y1="138" x2="515" y2="138" stroke="#84ab35" strokeWidth="2" />
          </g>
        ) : normalized.includes("history") ? (
          <g>
            {/* Classical Architectural Columns & Timeline */}
            <line x1="60" y1="210" x2="540" y2="210" stroke="#84ab35" strokeWidth="2" />
            <rect x="95" y="75" width="28" height="135" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <rect x="165" y="75" width="28" height="135" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <rect x="235" y="75" width="28" height="135" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <polygon points="80,75 179,32 278,75" fill="#1e3154" stroke="#6b8e23" strokeWidth="1.5" />
            <circle cx="380" cy="130" r="58" stroke="#6b8e23" strokeWidth="1.5" fill="#181b20" fillOpacity="0.7" />
            <circle cx="380" cy="130" r="38" stroke="#2c4470" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="380" y1="130" x2="380" y2="90" stroke="#84ab35" strokeWidth="2" />
            <line x1="380" y1="130" x2="412" y2="145" stroke="#f3f5f7" strokeWidth="2" />
          </g>
        ) : (
          <g>
            {/* Web & Software Architecture Canvas */}
            <rect x="55" y="38" width="290" height="184" rx="6" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
            <line x1="55" y1="66" x2="345" y2="66" stroke="#2c4470" strokeWidth="1.5" />
            <circle cx="74" cy="52" r="4" fill="#6b8e23" />
            <circle cx="88" cy="52" r="4" fill="#2c4470" />
            <rect x="75" y="84" width="110" height="52" rx="4" fill="#16243e" stroke="#6b8e23" strokeWidth="1.5" />
            <rect x="200" y="84" width="125" height="52" rx="4" fill="#21262d" stroke="#2c4470" strokeWidth="1" />
            <rect x="75" y="150" width="250" height="50" rx="4" fill="#21262d" stroke="#2c4470" strokeWidth="1" />
            {/* Overlapping Structural Frame */}
            <rect x="375" y="64" width="170" height="140" rx="6" fill="#1e3154" stroke="#84ab35" strokeWidth="1.5" />
            <path d="M400 105 L420 125 L400 145" stroke="#84ab35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="432" y1="145" x2="475" y2="145" stroke="#f3f5f7" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="400" y1="172" x2="515" y2="172" stroke="#7d8796" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* Subtle Scrim & Unboxed Category Label */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#181b20] via-transparent to-transparent opacity-80" />
      {title && (
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#b0b8c4] font-mono-tabular">
          <span className="truncate">{category.toUpperCase()}</span>
          <span>·</span>
          <span className="truncate text-[#84ab35]">BILLY STUDIO</span>
        </div>
      )}
    </div>
  );
};

/**
 * Hero Architectural Picture for the Landing Page
 */
export const HeroArchitecturePicture: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-[380px] rounded-lg overflow-hidden bg-[#16243e] border border-[#2c4470]/80 flex flex-col justify-between p-6">
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        viewBox="0 0 800 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="hero-grad" x1="0" y1="0" x2="800" y2="540" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16243e" />
            <stop offset="50%" stopColor="#1d2f50" />
            <stop offset="100%" stopColor="#181b20" />
          </linearGradient>
          <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="800" height="540" fill="url(#hero-grad)" />
        <rect width="800" height="540" fill="url(#hero-grid)" />

        {/* Architectural Blueprint Isometric Planes */}
        <g transform="translate(70, 55)">
          {/* Base Learning Canvas */}
          <rect x="0" y="30" width="420" height="290" rx="8" fill="#181b20" fillOpacity="0.92" stroke="#2c4470" strokeWidth="1.5" />
          <line x1="0" y1="68" x2="420" y2="68" stroke="#2c4470" strokeWidth="1.5" />
          <rect x="24" y="45" width="90" height="10" rx="2" fill="#6b8e23" />

          {/* Visual Diagram Nodes */}
          <rect x="28" y="96" width="165" height="90" rx="6" fill="#16243e" stroke="#6b8e23" strokeWidth="1.5" />
          <line x1="46" y1="122" x2="140" y2="122" stroke="#f3f5f7" strokeWidth="2.5" />
          <line x1="46" y1="144" x2="170" y2="144" stroke="#b0b8c4" strokeWidth="1.5" />
          <line x1="46" y1="162" x2="120" y2="162" stroke="#84ab35" strokeWidth="2" />

          <rect x="220" y="96" width="172" height="90" rx="6" fill="#21262d" stroke="#2c4470" strokeWidth="1.5" />
          <circle cx="262" cy="141" r="24" stroke="#84ab35" strokeWidth="3" fill="none" />
          <path d="M262 117 A24 24 0 0 1 286 141" stroke="#f3f5f7" strokeWidth="3" />
          <line x1="302" y1="130" x2="370" y2="130" stroke="#f3f5f7" strokeWidth="2" />
          <line x1="302" y1="150" x2="350" y2="150" stroke="#84ab35" strokeWidth="2" />

          {/* Audio Waveform Bar */}
          <rect x="28" y="210" width="364" height="78" rx="6" fill="#21262d" stroke="#2c4470" strokeWidth="1.5" />
          <circle cx="64" cy="249" r="18" fill="#6b8e23" />
          <polygon points="60,241 72,249 60,257" fill="#f3f5f7" />
          {/* Sound bars */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((idx) => {
            const h = 14 + ((idx * 17) % 32);
            return (
              <rect
                key={idx}
                x={104 + idx * 14}
                y={249 - h / 2}
                width="6"
                height={h}
                rx="2"
                fill={idx < 10 ? "#84ab35" : "#2c4470"}
              />
            );
          })}

          {/* Secondary Elevated Card: Billy Adaptive Mentor & Notebook */}
          <rect x="330" y="185" width="320" height="235" rx="8" fill="#1e3154" stroke="#84ab35" strokeWidth="2" />
          <line x1="330" y1="225" x2="650" y2="225" stroke="#2c4470" strokeWidth="1.5" />
          <rect x="354" y="200" width="110" height="10" rx="2" fill="#84ab35" />
          <rect x="354" y="248" width="272" height="58" rx="5" fill="#181b20" stroke="#2c4470" strokeWidth="1" />
          <line x1="372" y1="268" x2="560" y2="268" stroke="#f3f5f7" strokeWidth="2" />
          <line x1="372" y1="288" x2="500" y2="288" stroke="#b0b8c4" strokeWidth="1.5" />

          <rect x="354" y="324" width="130" height="68" rx="5" fill="#181b20" stroke="#6b8e23" strokeWidth="1.5" />
          <line x1="372" y1="348" x2="450" y2="348" stroke="#84ab35" strokeWidth="2" />
          <line x1="372" y1="368" x2="430" y2="368" stroke="#b0b8c4" strokeWidth="1.5" />

          <rect x="496" y="324" width="130" height="68" rx="5" fill="#181b20" stroke="#2c4470" strokeWidth="1.5" />
          <line x1="514" y1="348" x2="595" y2="348" stroke="#f3f5f7" strokeWidth="2" />
          <line x1="514" y1="368" x2="575" y2="368" stroke="#b0b8c4" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Top Overlay Label */}
      <div className="relative z-10 flex items-center justify-between text-xs font-mono-tabular text-[#b0b8c4] border-b border-[#2c4470]/60 pb-3">
        <span>STRENGTHEN IO ARCHITECTURE</span>
        <span>·</span>
        <span className="text-[#84ab35]">MENTOR: BILLY</span>
      </div>

      {/* Bottom Scrim & Caption */}
      <div className="relative z-10 mt-auto pt-32 bg-gradient-to-t from-[#181b20] via-[#181b20]/80 to-transparent -mx-6 -mb-6 p-6">
        <div className="grid grid-cols-3 gap-4 border-t border-[#2c4470]/60 pt-4 text-xs">
          <div>
            <p className="text-[#7d8796] font-mono-tabular">MODALITIES</p>
            <p className="text-[#f3f5f7] font-medium mt-0.5">Audio · Visual · Text · Video</p>
          </div>
          <div>
            <p className="text-[#7d8796] font-mono-tabular">ASSIGNMENTS</p>
            <p className="text-[#f3f5f7] font-medium mt-0.5">Relaxing to Challenging</p>
          </div>
          <div>
            <p className="text-[#7d8796] font-mono-tabular">CUSTOMIZATION</p>
            <p className="text-[#84ab35] font-medium mt-0.5">Live Preview & Tweaks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive Visual Diagram Sandbox inside Lessons
 */
export const InteractiveDiagramCanvas: React.FC<{
  diagram: VisualDiagram;
}> = ({ diagram }) => {
  const nodes = diagram?.nodes?.length
    ? diagram.nodes
    : [
        {
          id: "n1",
          label: "1. Core Input & Context",
          detail: "Foundational inputs and assumptions that establish the problem boundary.",
          metricOrRule: "Stage 01 · Input",
        },
        {
          id: "n2",
          label: "2. Structural Processing",
          detail: "Applying the core technique step by step to transform raw inputs.",
          metricOrRule: "Stage 02 · Process",
        },
        {
          id: "n3",
          label: "3. Verification & Output",
          detail: "Validating results against quality criteria and practical constraints.",
          metricOrRule: "Stage 03 · Output",
        },
      ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeNode = nodes[selectedIndex] || nodes[0];

  return (
    <div className="bg-[#16243e]/70 border border-[#2c4470] rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2c4470]/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
            <Compass className="w-3.5 h-3.5" />
            <span>INTERACTIVE VISUAL MODEL</span>
            <span>·</span>
            <span>{(diagram?.diagramType || "flow").toUpperCase()}</span>
          </div>
          <h4 className="text-lg font-semibold text-[#f3f5f7] mt-1">{diagram?.title || "Concept Architecture"}</h4>
        </div>
        <p className="text-xs text-[#b0b8c4]">{diagram?.interactivePrompt || "Select any stage below to inspect its mechanism."}</p>
      </div>

      {/* Interactive SVG + Node Selector Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
        {/* Left: Visual Node Graph (7 cols) */}
        <div className="lg:col-span-7 bg-[#181b20] border border-[#2c4470]/70 rounded-lg p-5 flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodes.map((node, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={node.id || idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`text-left p-4 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                      : "bg-[#21262d]/80 border-[#2c4470]/50 text-[#b0b8c4] hover:border-[#2c4470] hover:text-[#f3f5f7]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono-tabular mb-1.5">
                    <span className={isSelected ? "text-[#84ab35]" : "text-[#7d8796]"}>
                      0{idx + 1} · {node.metricOrRule || "CONCEPT NODE"}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#84ab35]" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-[#7d8796]" />
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug">{node.label}</p>
                </button>
              );
            })}
          </div>

          {/* Interactive SVG Flow Bar */}
          <div className="mt-5 pt-4 border-t border-[#282e37] flex items-center justify-between gap-2">
            {nodes.map((node, idx) => (
              <React.Fragment key={node.id || idx}>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex-1 h-2 rounded-sm transition-colors cursor-pointer ${
                    idx === selectedIndex
                      ? "bg-[#84ab35]"
                      : idx < selectedIndex
                      ? "bg-[#4b631c]"
                      : "bg-[#282e37]"
                  }`}
                  title={node.label}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right: Active Node Inspection Deck (5 cols) */}
        <div className="lg:col-span-5 bg-[#21262d] border border-[#2c4470]/80 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35] mb-2">
              <span>STAGE 0{selectedIndex + 1} OF 0{nodes.length}</span>
              <span>·</span>
              <span>{activeNode?.metricOrRule}</span>
            </div>
            <h5 className="text-base font-semibold text-[#f3f5f7] mb-3">{activeNode?.label}</h5>
            <p className="text-sm text-[#b0b8c4] leading-relaxed">{activeNode?.detail}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#282e37] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : nodes.length - 1))}
              className="px-3 py-1.5 text-xs font-medium text-[#b0b8c4] hover:text-[#f3f5f7] bg-[#181b20] border border-[#2c4470]/60 rounded transition-colors cursor-pointer"
            >
              Previous Node
            </button>
            <button
              type="button"
              onClick={() => setSelectedIndex((prev) => (prev + 1) % nodes.length)}
              className="px-3 py-1.5 text-xs font-medium text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next Node</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
