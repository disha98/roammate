"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {}
});

export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 3000;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onRemove, 300);
    }, DURATION);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto w-80 rounded-[1.5rem] border px-5 py-3.5 text-sm font-semibold shadow-xl transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
        toast.type === "success" &&
          "border-lagoon/30 bg-white text-lagoon",
        toast.type === "error" &&
          "border-coral/30 bg-white text-coral",
        toast.type === "info" &&
          "border-ink/20 bg-white text-ink"
      )}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = String(++counterRef.current);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
