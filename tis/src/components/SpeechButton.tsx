/**
 * SpeechButton — Reusable Speech-to-Text microphone button
 *
 * Uses the browser-native Web Speech API (no external API keys required).
 * Supports English, Tamil script, and Tanglish (Tamil spoken in English style).
 * Automatically translates/normalises speech into professional English.
 *
 * Usage:
 *   <SpeechButton
 *     onInterim={(text) => setFieldValue(text)}
 *     onFinal={(text) => setFieldValue(text)}
 *     accentColor="amber"   // "amber" | "blue" | "green" | "default"
 *   />
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSpeechController } from "../lib/speechToEnglish";

export type SpeechButtonAccent = "amber" | "blue" | "green" | "default";

export interface SpeechButtonProps {
  /** Called continuously while the user is speaking (interim results) */
  onInterim?: (text: string) => void;
  /** Called once when speech ends with the final translated text */
  onFinal?: (text: string) => void;
  /** Visual accent to match the surrounding section */
  accentColor?: SpeechButtonAccent;
  /** Extra class names for the button wrapper */
  className?: string;
  /** Disable the button externally */
  disabled?: boolean;
  /** Optional tooltip label */
  title?: string;
}

const ACCENT_STYLES: Record<
  SpeechButtonAccent,
  { idle: string; active: string; pulse: string; indicator: string; text: string }
> = {
  amber: {
    idle: "border-amber-300 text-amber-600 hover:bg-amber-50",
    active: "bg-amber-100 border-amber-500 text-amber-700",
    pulse: "bg-amber-400",
    indicator: "text-amber-600",
    text: "text-amber-600",
  },
  blue: {
    idle: "border-blue-300 text-blue-600 hover:bg-blue-50",
    active: "bg-blue-100 border-blue-500 text-blue-700",
    pulse: "bg-blue-400",
    indicator: "text-blue-600",
    text: "text-blue-600",
  },
  green: {
    idle: "border-[#81B532]/50 text-[#81B532] hover:bg-[#81B532]/10",
    active: "bg-[#81B532]/15 border-[#81B532] text-[#81B532]",
    pulse: "bg-[#81B532]",
    indicator: "text-[#81B532]",
    text: "text-[#81B532]",
  },
  default: {
    idle: "border-border text-muted-foreground hover:bg-muted",
    active: "bg-muted border-ring text-foreground",
    pulse: "bg-primary",
    indicator: "text-primary",
    text: "text-primary",
  },
};

export function SpeechButton({
  onInterim,
  onFinal,
  accentColor = "default",
  className,
  disabled = false,
  title,
}: SpeechButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const controllerRef = useRef<ReturnType<typeof createSpeechController> | null>(null);
  const accent = ACCENT_STYLES[accentColor];

  // Stable callbacks via refs so the controller closure doesn't go stale
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  useEffect(() => {
    const controller = createSpeechController({
      onInterim: (text) => onInterimRef.current?.(text),
      onFinal: (text) => onFinalRef.current?.(text),
      onStateChange: (isListening) => {
        setListening(isListening);
        if (!isListening) setErrorMsg(null);
      },
      onError: (message) => {
        setListening(false);
        setErrorMsg(message);
        // Auto-clear error after 5 s
        setTimeout(() => setErrorMsg(null), 5000);
      },
    });

    controllerRef.current = controller;
    setSupported(controller.supported);

    return () => {
      controller.stop();
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!supported || disabled) return;
    setErrorMsg(null);
    controllerRef.current?.toggle();
  }, [supported, disabled]);

  if (!supported) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground italic px-2 py-1 rounded border border-dashed border-border"
        title="Speech recognition is not supported in this browser"
      >
        <MicOff className="w-3 h-3" />
        <span className="hidden sm:inline">No mic support</span>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title ?? (listening ? "Stop dictation" : "Start dictation (English / Tamil / Tanglish)")}
        aria-label={listening ? "Stop speech recognition" : "Start speech recognition"}
        aria-pressed={listening}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed",
          listening ? accent.active : accent.idle,
          className
        )}
      >
        {/* Pulsing ring when active */}
        {listening && (
          <span
            className={cn(
              "absolute inset-0 rounded animate-ping opacity-30",
              accent.pulse
            )}
            aria-hidden="true"
          />
        )}

        {listening ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Mic className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      {/* Inline error tooltip */}
      {errorMsg && (
        <span
          role="alert"
          className="absolute mt-9 z-50 max-w-[220px] text-[10px] bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1 shadow-md leading-tight"
        >
          {errorMsg}
        </span>
      )}
    </div>
  );
}

/**
 * SpeechTextareaWrapper — Drop-in wrapper that adds a mic button
 * to any textarea section without modifying the textarea itself.
 *
 * Renders the mic button inline in the section header area.
 * The parent must pass setter callbacks.
 */
export interface SpeechTextareaWrapperProps {
  value: string;
  onChange: (value: string) => void;
  accentColor?: SpeechButtonAccent;
  children: React.ReactNode;
}

export function SpeechTextareaWrapper({
  value,
  onChange,
  accentColor = "default",
  children,
}: SpeechTextareaWrapperProps) {
  const [liveText, setLiveText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const baseValueRef = useRef(value);

  // Keep base value in sync when user types manually (not via speech)
  useEffect(() => {
    if (!isListening) {
      baseValueRef.current = value;
    }
  }, [value, isListening]);

  const handleInterim = useCallback((interimText: string) => {
    setIsListening(true);
    setLiveText(interimText);
    if (interimText) {
      // Show live preview: base + interim
      const combined = baseValueRef.current
        ? `${baseValueRef.current} ${interimText}`
        : interimText;
      onChange(combined);
    }
  }, [onChange]);

  const handleFinal = useCallback((finalText: string) => {
    setIsListening(false);
    setLiveText("");
    const combined = baseValueRef.current
      ? `${baseValueRef.current} ${finalText}`
      : finalText;
    baseValueRef.current = combined;
    onChange(combined);
  }, [onChange]);

  const accent = ACCENT_STYLES[accentColor];

  return (
    <div className="relative">
      {/* Mic button — absolutely positioned top-right of the wrapper */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        {isListening && (
          <span className={cn("text-[10px] font-medium animate-pulse", accent.text)}>
            Listening…
          </span>
        )}
        <SpeechButton
          onInterim={handleInterim}
          onFinal={handleFinal}
          accentColor={accentColor}
        />
      </div>

      {/* The actual textarea (passed as children) */}
      {children}

      {/* Live transcription hint */}
      {isListening && liveText && (
        <p className={cn("mt-1 text-[10px] font-medium truncate", accent.text)}>
          ✦ {liveText}
        </p>
      )}
    </div>
  );
}
