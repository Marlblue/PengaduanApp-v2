import { useState, useCallback } from "react";
import { ToastType } from "../components/Toast";

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");

  const showToast = useCallback(
    (msg: string, toastType: ToastType = "info") => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);
    },
    []
  );

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    message,
    type,
    showToast,
    hideToast,
  };
}
