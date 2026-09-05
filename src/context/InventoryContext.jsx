import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { SEED_DEPOT_TANKS } from "../data/seed";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [tanks, setTanks] = useState(() => {
    const saved = localStorage.getItem("fdms-depot-tanks");
    return saved ? JSON.parse(saved) : SEED_DEPOT_TANKS;
  });

  useEffect(() => {
    localStorage.setItem("fdms-depot-tanks", JSON.stringify(tanks));
  }, [tanks]);

  const refillTank = useCallback((tankId, amount = 10000) => {
    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === tankId) {
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
