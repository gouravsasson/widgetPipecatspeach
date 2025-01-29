import { useState, useEffect, useCallback, useMemo } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import "./agent.css";
import { LLMHelper, RTVIEvent } from "@pipecat-ai/client-js";
import {
  useRTVIClient,
  useRTVIClientTransportState,
} from "@pipecat-ai/client-react";

import useSessionStore from "./store/session";
import { axiosConfig3 } from "./axiosConfig";
import axios from "axios";
import { useWidgetContext } from "./constexts/WidgetContext";

function VoiceAgent(  ) {
  const client = useRTVIClient();
  const [value, setValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [llmHelper, setLLMHelper] = useState<LLMHelper | null>(null);
  const transportState = useRTVIClientTransportState();
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const sessionId = useSessionStore((state) => state.sessionId);
  console.log(sessionId);
  const [messages, setMessages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [botMessages, setBotMessages] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const { agent_id, schema } = useWidgetContext();
  const [appState, setAppState] = useState<
    "idle" | "ready" | "connecting" | "connected"
  >("idle");
  const particles = useMemo(
    () =>
      Array.from({ length: 180 }, () => ({
        x: Math.random() * 500 - 250,
        y: Math.random() * 500 - 250,
        size: 0.6 + Math.random() * 1.2,
        opacity: 0.3 + Math.random() * 0.4,
        hue: Math.random() * 15 - 7.5,
        delay: Math.random() * 0.8,
        scale: 0.98 + Math.random() * 0.25,
      })),
    []
  );

  const rings = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        radius: 140 + i * 28,
        particles: Array.from({ length: 45 }, () => ({
          angle: Math.random() * Math.PI * 2,
          speed: 0.18 + Math.random() * 0.1,
          size: 0.8 + Math.random() * 0.7,
          opacity: 0.3 + Math.random() * 0.35,
          hueRotate: Math.random() * 15 - 7.5,
          scale: 0.98 + Math.random() * 0.2,
        })),
      })),
    []
  );
  useEffect(() => {
    switch (transportState) {
      case "initialized":
        setAppState("ready");
        break;
      case "authenticating":
      case "connecting":
        setAppState("connecting");
        break;
      case "connected":
      case "ready":
        setAppState("connected");
        break;
      default:
        setAppState("idle");
    }
  }, [transportState]);
  useEffect(() => {
    if (transportState !== "connected") {
      return;
    }

    const transcriptionResponse = async () => {
      try {
        const response = await axios.post(
          `api/start-transcription/`,
          {
            schema_name: schema,
            call_session_id: sessionId,
          },
          axiosConfig3
        );
        console.log("Transcription API Response:", response.data);
      } catch (error) {
        console.error("Failed to start transcription:", error);
      }
    };

    transcriptionResponse();
  }, [transportState]);

  useEffect(() => {
    if (!client) return;

    const helper = new LLMHelper({
      callbacks: {},
    });

    // client.registerHelper("llm", helper);
    setLLMHelper(helper);

    return () => {
      client.unregisterHelper("llm");
    };
  }, [client]);

  client?.on(RTVIEvent.BotStartedSpeaking, () => {});
  client?.on(RTVIEvent.BotStoppedSpeaking, () => setTranscription(botMessages));
  // client?.on(RTVIEvent.UserStartedSpeaking, () => {
  //   setUserMessages([]);
  // });
  // client?.on(RTVIEvent.UserStoppedSpeaking, () => {
  //   setTranscription(userMessages);
  // });
  client?.on(RTVIEvent.BotTranscript, (data) => {
    setBotMessages(data.text);
  });

  // client?.on(RTVIEvent.UserTranscript, (data) => {
  //   setUserMessages(data.text);
  // });

  const toggleMic = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      setIsMuted(false);
    } else {
      setIsMuted(!isMuted);
    }
  }, [isActive, isMuted]);
  const handleConnect = async () => {
    if (isConnected || !client) return;
    try {
      await client.connect();
      setIsConnected(true);
    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    if (!isConnected || !client) return;
    if (!sessionId) {
      console.error("Cannot end session: Missing session ID");
      return;
    }
    try {
      setSessionId(null);

      await axios.post(
        `${axiosConfig3.baseURL}/api/end_call_session/`,
        {
          call_session_id: sessionId,
          schema_name: schema,
        },
        {
          headers: {
            // Authorization: `Bearer ${token}`,
          },
        }
      );

      setSessionId(null);
      await client.disconnect();
      setIsConnected(false);
    } catch (error) {
      console.error("Disconnection error:", error);
      alert("Failed to disconnect. Please try again.");
    }
  };
  // useEffect(() => {
  //   if (isActive && !isMuted) {
  //     const phrases = [
  //       "Processing voice input...",
  //       "Analyzing audio patterns...",
  //       "Converting speech to text...",
  //       "Interpreting voice commands...",
  //     ];
  //     let index = 0;
  //     const interval = setInterval(() => {
  //       setTranscription(phrases[index % phrases.length]);
  //       index++;
  //     }, 2000);
  //     return () => clearInterval(interval);
  //   } else {
  //     setTranscription("");
  //   }
  // }, [isActive, isMuted]);

  return (
    <div className="voice-interface">
      <div className="glass-sphere">
        {/* Enhanced Glass Background */}
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full glass-layer-primary" />
          <div className="absolute inset-0 rounded-full glass-layer-secondary" />
          <div className="absolute inset-0 rounded-full glass-layer-tertiary" />
          <div className="absolute inset-0 rounded-full glass-layer-noise" />
        </div>

        {/* Optimized Particle Field */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full enhanced-particle"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${250 + particle.x}px`,
                top: `${250 + particle.y}px`,
                opacity: `isActive ? particle.opacity : 0`,
                filter: `blur(0.3px) hue-rotate(${particle.hue}deg)`,
                transform: `scale(${isActive ? particle.scale : 0})`,
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${particle.delay}s`,
                willChange: `transform, opacity`,
              }}
            />
          ))}
        </div>

        {/* Optimized Orbital System */}
        {rings.map((ring, ringIndex) => (
          <div
            key={ringIndex}
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${ring.radius * 2}px`,
              height: `${ring.radius * 2}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {ring.particles.map((particle, i) => (
              <div
                key={i}
                className="absolute enhanced-orbital-particle"
                style={{
                  "--orbit-radius": `${ring.radius}px`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  opacity: `isActive ? particle.opacity : 0`,
                  animation: isActive
                    ? `orbit ${80 / particle.speed}s linear infinite`
                    : "none",
                  transform: `scale(${particle.scale})`,
                  willChange: "transform",
                }}
              >
                <div
                  className={`w-full h-full rounded-full particle-core ${
                    isActive ? (isMuted ? "muted" : "active") : "inactive"
                  }`}
                  style={{
                    filter: `blur(0.2px) hue-rotate(${particle.hueRotate}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Enhanced Microphone Button */}
        <button
          onClick={() => {
            handleConnect(), toggleMic();
          }}
          className={`mic-button-enhanced relative rounded-full flex items-center justify-center z-10
            ${
              isActive
                ? isMuted
                  ? "text-red-400 muted-state"
                  : "text-white active-state"
                : "text-white/80 inactive-state"
            }`}
        >
          <div className="absolute inset-0 rounded-full glass-button-primary" />
          <div className="absolute inset-0 rounded-full glass-button-secondary" />
          <div className="absolute inset-0 rounded-full glass-button-border" />

          {/* Optimized Pulse Rings */}
          {Array.from({ length: 4 }).map((_, ring) => (
            <div
              key={ring}
              className={`absolute inset-0 rounded-full border enhanced-pulse-ring
                ${isActive ? (isMuted ? "muted" : "active") : "inactive"}`}
              style={{
                animation:
                  isActive && !isMuted
                    ? `pulse-ring ${
                        ring * 0.7 + 1.4
                      }s cubic-bezier(0.4, 0, 0.6, 1) infinite ${ring * 0.2}s`
                    : "none",
                willChange: "transform, opacity",
              }}
            />
          ))}

          <div className="absolute inset-2 rounded-full enhanced-inner-glow" />

          <div className="transform transition-all duration-500 hover:scale-110 relative z-10">
            {isMuted ? <MicOff size={48} /> : <Mic size={48} />}
          </div>
        </button>

        {/* Status Text */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-[280px]">
          <div
            className={`status-panel py-3 px-6 transform transition-all duration-700
            ${
              messages
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-4 opacity-0 scale-95"
            }`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-lg enhanced-glass-text" />
            <p className="relative text-sm font-light text-center text-white/95 tracking-wider">
              <div className="live-subtitles">
                <p>{transcription}</p>
              </div>{" "}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="end-call-button ml-[40%] pt-8"
          >
            <PhoneOff size={48} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceAgent;
