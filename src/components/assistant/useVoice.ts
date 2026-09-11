"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface VoiceCallbacks {
  /** Interim text while the applicant is still talking, then the final text of each utterance. */
  onTranscript: (text: string, final: boolean) => void;
  onError: (message: string) => void;
}

export interface Voice {
  /** Whether the browser has Web Speech recognition. Nothing is ever read aloud. */
  supported: boolean;
  /** Live mode: the mic stays open and every finished utterance reaches onTranscript. */
  live: boolean;
  listening: boolean;
  startLive: () => void;
  stopLive: () => void;
  /** One utterance, then the mic closes. */
  pushToTalk: () => void;
  stopListening: () => void;
}

const RESTART_DELAY_MS = 250;

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useVoice(callbacks: VoiceCallbacks): Voice {
  const supported = useMemo(() => recognitionConstructor() !== undefined, []);
  const [live, setLive] = useState(false);
  const [listening, setListening] = useState(false);

  const recognition = useRef<SpeechRecognition | null>(null);
  const liveRef = useRef(false);
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
      instance.maxAlternatives = 1;
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
        // Chrome ends continuous recognition on silence; live mode reopens it.
        if (liveRef.current) {
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

  const startLive = useCallback(() => {
    if (!supported) return;
    liveRef.current = true;
    setLive(true);
    startRecognition(true);
  }, [startRecognition, supported]);

  const stopLive = useCallback(() => {
    liveRef.current = false;
    setLive(false);
    stopListening();
  }, [stopListening]);

  const pushToTalk = useCallback(() => {
    if (!supported) return;
    startRecognition(false);
  }, [startRecognition, supported]);

  useEffect(
    () => () => {
      liveRef.current = false;
      clearRestart();
      recognition.current?.abort();
      recognition.current = null;
    },
    [clearRestart],
  );

  return { supported, live, listening, startLive, stopLive, pushToTalk, stopListening };
}
