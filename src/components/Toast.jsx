// A tiny toast bus + its single display element. Any component can call
// toast("message") and the one mounted <Toast/> (in Layout) shows it in a
// bottom-center pill for ~2s. Latest message wins; the timer resets on
// each call so rapid clicks don't stack up.
import { useEffect, useRef, useState } from "react";

const TOAST_EVENT = "pokedex:toast";

export function toast(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export default function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    function onToast(event) {
      setMessage(event.detail);
      setVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 2000);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      className={`toast${visible ? " toast-visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
