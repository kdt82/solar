import useSWR from "swr";
import { useState } from "react";

interface AlertSettings {
  id: number;
  enabled: boolean;
  timeWindowStart: string;
  timeWindowEnd: string;
  threshold: number;
  duration: number;
  cooldown: number;
  speakerGroup: string;
  volume: number;
  timezone: string;
}

interface UseAlertSettingsReturn {
  settings: AlertSettings | null;
  isLoading: boolean;
  isError: boolean;
  save: (data: Partial<AlertSettings>) => Promise<void>;
  test: () => Promise<void>;
  isSaving: boolean;
  isTesting: boolean;
  saveError: string | null;
  testError: string | null;
  saveSuccess: boolean;
  testSuccess: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAlertSettings(): UseAlertSettingsReturn {
  const { data, error, mutate } = useSWR<AlertSettings>(
    "/api/alerts/settings",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const save = async (updatedData: Partial<AlertSettings>) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/alerts/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details?.join(", ") || errorData.error || "Failed to save settings"
        );
      }

      const newSettings = await response.json();
      mutate(newSettings, false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const test = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      const response = await fetch("/api/alerts/test", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send test alert");
      }

      setTestSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setTestSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test alert";
      setTestError(message);
      throw err;
    } finally {
      setIsTesting(false);
    }
  };

  return {
    settings: data || null,
    isLoading: !error && !data,
    isError: !!error,
    save,
    test,
    isSaving,
    isTesting,
    saveError,
    testError,
    saveSuccess,
    testSuccess,
  };
}
