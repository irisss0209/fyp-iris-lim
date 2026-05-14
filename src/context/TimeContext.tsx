import { createContext, useContext, useState, useEffect } from "react";

type TimeContextType = {
  format: "12h" | "24h";
  setFormat: (f: "12h" | "24h") => void;
};

const TimeContext = createContext<TimeContextType>({
  format: "24h",
  setFormat: () => { }
});

export const useTime = () => useContext(TimeContext);

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormat] = useState<"12h" | "24h">(() =>
    (localStorage.getItem("timeFormat") as "12h" | "24h") || "24h"
  );

  useEffect(() => {
    localStorage.setItem("timeFormat", format);
  }, [format]);

  return (
    <TimeContext.Provider value={{ format, setFormat }}>
      {children}
    </TimeContext.Provider>
  );
}
