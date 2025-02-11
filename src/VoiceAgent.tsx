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

function VoiceAgent() {
  const client = useRTVIClient();
  const [value, setValue] = useState("");
  // const [llmHelper, setLLMHelper] = useState<LLMHelper | null>(null);
  const transportState = useRTVIClientTransportState();
  console.log(transportState);
  const {
    setSessionId,
    sessionId,
    setTransport,
    setIsConnected,
    isConnected,
    transcription,
    setTranscription,
    setRefresh,
    refresh,
  } = useSessionStore();
  console.log(isConnected);
  const [messages, setMessages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [botMessages, setBotMessages] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [appState, setAppState] = useState<
    "idle" | "ready" | "connecting" | "connected"
  >("idle");
  useEffect(() => {
    if (transportState) {
      setTransport(transportState);
    }
  }, [transportState]);
  const { agent_id, schema } = useWidgetContext();
  // const agent_id = "d86278ce-beff-4d75-a311-3400bd774b0c";
  // const schema = "6af30ad4-a50c-4acc-8996-d5f562b6987f";

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
          `/api/start-transcription/`,
          {
            schema_name: schema,
            call_session_id: sessionId,
          },
          axiosConfig3
        );
        // console.log("Transcription API Response:", response.data);
      } catch (error) {
        console.error("Failed to start transcription:", error);
      }
    };

    transcriptionResponse();
  }, [transportState]);

  client?.on(RTVIEvent.BotStartedSpeaking, () => {});
  client?.on(RTVIEvent.BotStoppedSpeaking, () => setTranscription(botMessages));
  client?.on(RTVIEvent.BotTranscript, (data) => {
    setBotMessages(data.text);
  });

  const handleToggleConnection = async () => {
    if (!isConnected) {
      if (!client) return;
      try {
        await client.connect();
        setIsConnected(true);
      } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect. Please try again.");
      }
    } else {
      if (!sessionId) {
        console.error("Cannot end session: Missing session ID");
        return;
      }
      try {
        await axios.post(`${axiosConfig3.baseURL}/api/end_call_session/`, {
          call_session_id: sessionId,
          schema_name: schema,
        });
        setSessionId(null);
        await client?.disconnect();
        setIsConnected(false);
        setRefresh(!refresh);
      } catch (error) {
        console.error("Disconnection error:", error);
        alert("Failed to disconnect. Please try again.");
      }
    }
  };

  return (
    <div className="voice-interface">
      <div className="glass-sphere">
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

        {rings.map((ring, ringIndex) => (
          <div
            key={ringIndex}
            className="absolute top-1/2"
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

        <button
          onClick={handleToggleConnection}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
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
            {/* {isMuted ? <MicOff size={48} /> : <Mic size={48} />} */}
            {!isConnected ? (
              <Mic size={48} />
            ) : (
              <div className="relative">
                {/* <div
                  className={`transition-opacity duration-200 ${
                    isHovered ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <Mic size={48} />
                </div>
                <div
                  className={`absolute top-0 left-0 transition-opacity duration-200 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                > */}
                <PhoneOff size={48} className="text-white" />
              </div>
              // </div>
            )}
          </div>
        </button>

        {/* Status Text */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-[280px] mt-[-2]">
          <div
            className={`status-panel py-3 px-6 transform transition-all duration-700
            ${
              messages
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-4 opacity-0 scale-95"
            }`}
          >
            <div className="absolute inset-0 overflow-hidden bg-white/70 rounded-lg enhanced-glass-text" />
            <p className="relative text-sm font-light text-center text-white/95 tracking-wider">
              <div className="live-subtitles">
                <p className="text-blue-400">{transcription}</p>
              </div>{" "}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceAgent;
