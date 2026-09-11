"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tone } from "@/lib/types";

export interface VoiceCallbacks {
  /** Interim text while the applicant is still talking, then the final text of each utterance. */
  onTranscript: (text: string, final: boolean) => void;
  onError: (message: string) => void;
}

export interface VoiceSupport {
  recognition: boolean;
  synthesis: boolean;
}

export interface Voice {
  support: VoiceSupport;
  /** Live conversation: the mic stays open between turns and replies are read aloud. */
  live: boolean;
  listening: boolean;
  speaking: boolean;
  startLive: () => void;
  stopLive: () => void;
  /** One utterance, then the mic closes. The old mic button. */
  pushToTalk: () => void;
  stopListening: () => void;
  /** Reads a reply aloud; in live mode the mic pauses so the Roadie does not hear itself. */
  speak: (text: string) => Promise<void>;
  cancelSpeech: () => void;
}

const RESTART_DELAY_MS = 250;

/** Rate and pitch per tone so a hype Roadie sounds different from a chill one. */
const TONE_DELIVERY: Record<Tone, { rate: number; pitch: number }> = {
  hype: { rate: 1.12, pitch: 1.1 },
  chill: { rate: 0.94, pitch: 0.95 },
  moody: { rate: 0.98, pitch: 0.85 },
  warm: { rate: 1, pitch: 1 },
};

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function synthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const short = lang.split("-")[0] ?? lang;
  return (
    voices.find((voice) => voice.lang === lang && voice.localService) ??
    voices.find((voice) => voice.lang === lang) ??
    voices.find((voice) => voice.lang.startsWith(short))
  );
}

export function useVoice(callbacks: VoiceCallbacks, tone: Tone | undefined): Voice {
  const support = useMemo<VoiceSupport>(
    () => ({ recognition: recognitionConstructor() !== undefined, synthesis: synthesisSupported() }),
    [],
  );
  const [live, setLive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognition = useRef<SpeechRecognition | null>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlers = useRef(callbacks);
  const restart = useRef<(continuous: boolean) => void>(() => {});

  useEffect(() => {
    handlers.current = callbacks;
  }, [callbacks]);

  const clearRestart = useCallback(() => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = null;
  }, []);

  const stopListening = useCallback(() => {
    clearRestart();
    const instance = recognition.current;
    recognition.current = null;
    if (instance) {
      instance.onend = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.abort();
    }
    setListening(false);
  }, [clearRestart]);

  const startRecognition = useCallback(
    (continuous: boolean) => {
      const Recognition = recognitionConstructor();
      if (!Recognition) return;
      stopListening();
      const instance = new Recognition();
      instance.continuous = continuous;
      instance.interimResults = true;
      instance.lang = navigator.language || "en-US";
      instance.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript ?? "";
          if (result?.isFinal) final += transcript;
          else interim += transcript;
        }
        if (final.trim()) {
          handlers.current.onTranscript(final.trim(), true);
          if (!continuous) stopListening();
        } else if (interim) {
          handlers.current.onTranscript(interim, false);
        }
      };
      instance.onerror = (event) => {
        if (event.error === "aborted" || event.error === "no-speech") return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          liveRef.current = false;
          setLive(false);
          stopListening();
          handlers.current.onError("Microphone access was blocked. Allow it in the browser and try again.");
          return;
        }
        if (!continuous) {
          stopListening();
          handlers.current.onError("Could not hear you. Check the microphone and try again.");
        }
      };
      instance.onend = () => {
        if (recognition.current !== instance) return;
        recognition.current = null;
        setListening(false);
        if (liveRef.current && !speakingRef.current) {
          clearRestart();
          restartTimer.current = setTimeout(() => restart.current(true), RESTART_DELAY_MS);
        }
      };
      recognition.current = instance;
      try {
        instance.start();
        setListening(true);
      } catch {
        recognition.current = null;
        setListening(false);
      }
    },
    [clearRestart, stopListening],
  );

  useEffect(() => {
    restart.current = startRecognition;
  }, [startRecognition]);

  const cancelSpeech = useCallback(() => {
    if (synthesisSupported()) window.speechSynthesis.cancel();
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const startLive = useCallback(() => {
    if (!support.recognition) return;
    liveRef.current = true;
    setLive(true);
    startRecognition(true);
  }, [startRecognition, support.recognition]);

  const stopLive = useCallback(() => {
    liveRef.current = false;
    setLive(false);
    cancelSpeech();
    stopListening();
  }, [cancelSpeech, stopListening]);

  const pushToTalk = useCallback(() => {
    if (!support.recognition) return;
    cancelSpeech();
    startRecognition(false);
  }, [cancelSpeech, startRecognition, support.recognition]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const clean = text.replace(/\s+/g, " ").trim();
        if (!synthesisSupported() || !clean) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        if (liveRef.current) stopListening();
        const utterance = new SpeechSynthesisUtterance(clean);
        const lang = navigator.language || "en-US";
        utterance.lang = lang;
        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;
        const delivery = TONE_DELIVERY[tone ?? "warm"];
        utterance.rate = delivery.rate;
        utterance.pitch = delivery.pitch;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          speakingRef.current = false;
          setSpeaking(false);
          if (liveRef.current) startRecognition(true);
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        speakingRef.current = true;
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }),
    [startRecognition, stopListening, tone],
  );

  useEffect(
    () => () => {
      liveRef.current = false;
      clearRestart();
      recognition.current?.abort();
      recognition.current = null;
      if (synthesisSupported()) window.speechSynthesis.cancel();
    },
    [clearRestart],
  );

  return { support, live, listening, speaking, startLive, stopLive, pushToTalk, stopListening, speak, cancelSpeech };
}
