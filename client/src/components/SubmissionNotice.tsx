import { useEffect, useState } from "react";

// Firestore keeps a write pending until the server acknowledges it, including during a network outage.
export function SubmissionNotice({
  pending,
  message,
}: {
  pending: boolean;
  message: string;
}) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    setWaiting(false);
    if (!pending) return;
    const timer = window.setTimeout(() => setWaiting(true), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return (
    <p role="status">
      {pending && waiting
        ? "Still waiting for the service. Keep this page open while your submission is confirmed."
        : message}
    </p>
  );
}
