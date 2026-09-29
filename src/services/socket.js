import io from "socket.io-client";

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== "undefined" && window.location) {
    const isLocalhostClient =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalhostClient && envUrl && envUrl.includes("localhost")) {
      return envUrl.replace("localhost", window.location.hostname);
    }
    if (!envUrl) {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }
  return envUrl || "http://localhost:5000";
};
const SOCKET_URL = getSocketUrl();

let socket = null;
const connectionListeners = new Set();

/**
 * Returns the singleton Socket.IO instance configured with auto-reconnect
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to FDMS Gateway with ID:", socket.id);
      connectionListeners.forEach((fn) => fn(true));
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket.IO] Disconnected from server:", reason);
      connectionListeners.forEach((fn) => fn(false));
    });

    socket.on("connect_error", (error) => {
      console.warn("[Socket.IO] Connection error:", error.message);
      connectionListeners.forEach((fn) => fn(false));
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`[Socket.IO] Successfully reconnected after ${attemptNumber} attempt(s)`);
      connectionListeners.forEach((fn) => fn(true));
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[Socket.IO] Reconnect attempt #${attemptNumber}...`);
    });
  }

  return socket;
};

/**
 * Subscribe to online/connected status changes
 */
export const onSocketConnectionChange = (callback) => {
  connectionListeners.add(callback);
  if (socket) {
    callback(socket.connected);
  }
  return () => {
    connectionListeners.delete(callback);
  };
};

export default getSocket;
