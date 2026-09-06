import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { SEED_DEPOT_TANKS } from "../data/seed";
import { inventoryApi } from "../services/api";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [tanks, setTanks] = useState(() => {
    const saved = localStorage.getItem("fdms-depot-tanks");
    return saved ? JSON.parse(saved) : SEED_DEPOT_TANKS;
  });

  // Load live inventory from backend API
  useEffect(() => {
    let mounted = true;
    inventoryApi
      .getInventory()
      .then((res) => {
        if (mounted && res.data && res.data.length > 0) {
          const normalized = res.data.map((t) => ({
            id: t.tankId || t._id,
            mongoId: t._id,
            fuelCode: t.fuelType || t.fuelCode,
            name: t.name || `Tank - ${t.fuelType || t.fuelCode}`,
            capacity: t.capacity,
            current: t.currentStock != null ? t.currentStock : t.current,
            threshold: t.minimumThreshold != null ? t.minimumThreshold : t.threshold,
            reserved: t.reserved || 0,
            temp: t.temp || 25.0,
            pressure: t.pressure || 1.0,
            lastRefill: t.lastRefill || new Date().toISOString().split("T")[0],
          }));
          setTanks(normalized);
        }
      })
      .catch((err) => {
        console.warn("[Inventory] Backend API unavailable, continuing with local tanks:", err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("fdms-depot-tanks", JSON.stringify(tanks));
  }, [tanks]);

  const refillTank = useCallback((tankId, amount = 10000) => {
    inventoryApi
      .refillInventory({ tankId, amount, quantity: amount })
      .catch((err) => {
        console.warn("[Inventory] API refill error, updating locally:", err.message);
      });

    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === tankId || t.fuelCode === tankId) {
          const newCurrent = Math.min(t.capacity, t.current + amount);
          return {
            ...t,
            current: newCurrent,
            lastRefill: new Date().toISOString().split("T")[0],
          };
        }
        return t;
      })
    );
  }, []);

  const hasSufficientStock = useCallback((fuelCode, amount) => {
    const tank = tanks.find((t) => t.fuelCode === fuelCode);
    if (!tank) return false;
    const available = tank.current - (tank.reserved || 0);
    return available >= amount;
  }, [tanks]);

  const reserveStock = useCallback((fuelCode, amount) => {
    let result = { success: false, reason: "Fuel tank not found" };
    setTanks((prev) => {
      let updated = false;
      const nextTanks = prev.map((t) => {
        if (t.fuelCode === fuelCode) {
          const reserved = t.reserved || 0;
          const available = t.current - reserved;
          if (available < amount) {
            result = {
              success: false,
              reason: `Insufficient available stock in depot tank for ${fuelCode}. Available: ${available.toLocaleString()} L, Requested: ${amount.toLocaleString()} L`,
              available,
            };
            return t;
          }
          updated = true;
          result = { success: true, reserved: reserved + amount };
          return { ...t, reserved: reserved + amount };
        }
        return t;
      });
      return updated ? nextTanks : prev;
    });
    return result;
  }, []);

  const releaseReservation = useCallback((fuelCode, amount) => {
    setTanks((prev) =>
      prev.map((t) => {
        if (t.fuelCode === fuelCode) {
          const reserved = Math.max(0, (t.reserved || 0) - amount);
          return { ...t, reserved };
        }
        return t;
      })
    );
  }, []);

  const deductStock = useCallback((fuelCode, amount) => {
    setTanks((prev) =>
      prev.map((t) => {
        if (t.fuelCode === fuelCode) {
          const newCurrent = Math.max(0, t.current - amount);
          const newReserved = Math.max(0, (t.reserved || 0) - amount);
          return { ...t, current: newCurrent, reserved: newReserved };
        }
        return t;
      })
    );
  }, []);

  const resetTanks = useCallback(() => {
    localStorage.removeItem("fdms-depot-tanks");
    setTanks(SEED_DEPOT_TANKS);
  }, []);

  // Compute total volume & low stock warnings
  const lowStockWarnings = useMemo(() => {
    return tanks.filter((t) => t.current <= t.threshold);
  }, [tanks]);

  const value = useMemo(
    () => ({
      tanks,
      refillTank,
      deductStock,
      reserveStock,
      releaseReservation,
      hasSufficientStock,
      resetTanks,
      lowStockWarnings,
    }),
    [tanks, refillTank, deductStock, reserveStock, releaseReservation, hasSufficientStock, resetTanks, lowStockWarnings]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}
