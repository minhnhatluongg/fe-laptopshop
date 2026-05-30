import { useEffect, useRef, useState, useCallback } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export interface InventoryUpdate {
  productId: number;
  newStock: number;
  updatedAt: string;
}

export interface BulkJobCompletedEvent {
  jobId: string;
  success: number;
  fail: number;
  message: string;
  jobType?: string;
}

export interface BulkJobProgressEvent {
  jobId: string;
  progressPercent: number;
  processedCount: number;
  totalCount: number;
}

interface UseInventoryHubOptions {
  enabled?: boolean;
  onInventoryUpdated?: (update: InventoryUpdate) => void;
  onBulkJobCompleted?: (event: BulkJobCompletedEvent) => void;
  onBulkJobProgress?: (event: BulkJobProgressEvent) => void;
  group?: "admin" | "public";
}

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL}/hubs/inventory`;

export function useInventoryHub({
  enabled = true,
  onInventoryUpdated,
  onBulkJobCompleted,
  onBulkJobProgress,
  group = "admin",
}: UseInventoryHubOptions = {}) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [state, setState] = useState<HubConnectionState>(HubConnectionState.Disconnected);
  const [lastUpdate, setLastUpdate] = useState<InventoryUpdate | null>(null);

  const handleUpdate = useCallback(
    (update: InventoryUpdate) => {
      setLastUpdate(update);
      onInventoryUpdated?.(update);
    },
    [onInventoryUpdated],
  );

  const handleBulkCompleted = useCallback(
    (event: BulkJobCompletedEvent) => onBulkJobCompleted?.(event),
    [onBulkJobCompleted],
  );

  const handleBulkProgress = useCallback(
    (event: BulkJobProgressEvent) => onBulkJobProgress?.(event),
    [onBulkJobProgress],
  );

  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        // Không gửi JWT cookie cho SignalR — server không require auth
        // Nếu muốn auth: .withUrl(HUB_URL, { accessTokenFactory: () => token })
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning,
      )
      .build();

    connectionRef.current = connection;

    // Listen to inventory events
    connection.on("InventoryUpdated",  handleUpdate);
    connection.on("BulkJobCompleted", handleBulkCompleted);
    connection.on("BulkJobProgress",  handleBulkProgress);
    connection.on("BulkJobFailed",    (e: { jobId: string; error: string }) =>
      handleBulkCompleted({ jobId: e.jobId, success: 0, fail: 0, message: `❌ ${e.error}` }));

    // Track state changes
    connection.onreconnecting(() => setState(HubConnectionState.Reconnecting));
    connection.onreconnected(() => setState(HubConnectionState.Connected));
    connection.onclose(() => setState(HubConnectionState.Disconnected));

    // Start + join group
    const start = async () => {
      try {
        await connection.start();
        setState(HubConnectionState.Connected);
        await connection.invoke("JoinGroup", group);
        console.log(`[SignalR] Connected to InventoryHub, joined group '${group}'`);
      } catch (err) {
        console.warn("[SignalR] Connection failed:", err);
        setState(HubConnectionState.Disconnected);
      }
    };

    void start();

    return () => {
      connection.off("InventoryUpdated");
      connection.off("BulkJobCompleted");
      connection.off("BulkJobProgress");
      connection.off("BulkJobFailed");
      void connection.stop();
    };
  }, [enabled, group, handleUpdate]);

  const reconnect = useCallback(async () => {
    if (connectionRef.current?.state === HubConnectionState.Disconnected) {
      try {
        await connectionRef.current.start();
        await connectionRef.current.invoke("JoinGroup", group);
        setState(HubConnectionState.Connected);
      } catch (err) {
        console.warn("[SignalR] Reconnect failed:", err);
      }
    }
  }, [group]);

  return {
    state,
    isConnected: state === HubConnectionState.Connected,
    lastUpdate,
    reconnect,
  };
}
