"use client";

import { useState } from "react";
import { IconBell, IconBellOff, IconCheck } from "@tabler/icons-react";
import styles from "./AlertSettings.module.css";

interface AlertSettingsData {
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

interface AlertSettingsProps {
  settings: AlertSettingsData | null;
  onSave: (settings: Partial<AlertSettingsData>) => Promise<void>;
  onTest: () => Promise<void>;
  isSaving: boolean;
  isTesting: boolean;
}

const TIMEZONES = [
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT/AEST)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACDT/ACST)" },
  { value: "Australia/Darwin", label: "Darwin (ACST)" },
  { value: "Australia/Hobart", label: "Hobart (AEDT/AEST)" },
];

export function AlertSettings({
  settings,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: AlertSettingsProps) {
  const [formData, setFormData] = useState<Partial<AlertSettingsData>>(
    settings || {
      enabled: false,
      timeWindowStart: "00:00",
      timeWindowEnd: "23:59",
      threshold: 2.5,
      duration: 5,
      cooldown: 15,
      speakerGroup: "media_player.google_home_group",
      volume: 0.5,
      timezone: "Australia/Sydney",
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof AlertSettingsData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (
      formData.threshold !== undefined &&
      (formData.threshold < 0 || formData.threshold > 20)
    ) {
      newErrors.threshold = "Must be between 0 and 20 kW";
    }

    if (
      formData.duration !== undefined &&
      (formData.duration < 1 || formData.duration > 120)
    ) {
      newErrors.duration = "Must be between 1 and 120 minutes";
    }

    if (
      formData.cooldown !== undefined &&
      (formData.cooldown < 1 || formData.cooldown > 240)
    ) {
      newErrors.cooldown = "Must be between 1 and 240 minutes";
    }

    if (
      formData.speakerGroup &&
      !formData.speakerGroup.startsWith("media_player.")
    ) {
      newErrors.speakerGroup = "Must start with 'media_player.'";
    }

    if (
      formData.volume !== undefined &&
      (formData.volume < 0 || formData.volume > 1)
    ) {
      newErrors.volume = "Must be between 0 and 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave(formData);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {formData.enabled ? (
            <IconBell className={styles.icon} />
          ) : (
            <IconBellOff className={styles.iconDisabled} />
          )}
          <h2 className={styles.title}>Grid Import Alerts</h2>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={formData.enabled || false}
            onChange={(e) => handleChange("enabled", e.target.checked)}
          />
          <span className={styles.toggleSlider}></span>
          <span className={styles.toggleLabel}>
            {formData.enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
      </div>

      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Time Window Start</label>
          <input
            type="time"
            className={styles.input}
            value={formData.timeWindowStart || "00:00"}
            onChange={(e) => handleChange("timeWindowStart", e.target.value)}
            disabled={!formData.enabled}
          />
          <span className={styles.hint}>Start of monitoring period</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Time Window End</label>
          <input
            type="time"
            className={styles.input}
            value={formData.timeWindowEnd || "23:59"}
            onChange={(e) => handleChange("timeWindowEnd", e.target.value)}
            disabled={!formData.enabled}
          />
          <span className={styles.hint}>End of monitoring period</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Grid Import Threshold (kW)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="20"
            className={`${styles.input} ${errors.threshold ? styles.inputError : ""}`}
            value={formData.threshold || 2.5}
            onChange={(e) =>
              handleChange("threshold", parseFloat(e.target.value))
            }
            disabled={!formData.enabled}
          />
          {errors.threshold && (
            <span className={styles.error}>{errors.threshold}</span>
          )}
          <span className={styles.hint}>Alert when exceeding this value</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Duration (minutes)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="120"
            className={`${styles.input} ${errors.duration ? styles.inputError : ""}`}
            value={formData.duration || 5}
            onChange={(e) => handleChange("duration", parseInt(e.target.value))}
            disabled={!formData.enabled}
          />
          {errors.duration && (
            <span className={styles.error}>{errors.duration}</span>
          )}
          <span className={styles.hint}>
            How long threshold must be exceeded
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Cooldown (minutes)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="240"
            className={`${styles.input} ${errors.cooldown ? styles.inputError : ""}`}
            value={formData.cooldown || 15}
            onChange={(e) => handleChange("cooldown", parseInt(e.target.value))}
            disabled={!formData.enabled}
          />
          {errors.cooldown && (
            <span className={styles.error}>{errors.cooldown}</span>
          )}
          <span className={styles.hint}>Time between alerts</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Speaker Group Entity</label>
          <input
            type="text"
            className={`${styles.input} ${errors.speakerGroup ? styles.inputError : ""}`}
            value={formData.speakerGroup || ""}
            onChange={(e) => handleChange("speakerGroup", e.target.value)}
            placeholder="media_player.google_home_group"
            disabled={!formData.enabled}
          />
          {errors.speakerGroup && (
            <span className={styles.error}>{errors.speakerGroup}</span>
          )}
          <span className={styles.hint}>Home Assistant entity ID</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Volume: {((formData.volume || 0.5) * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            className={styles.slider}
            value={formData.volume || 0.5}
            onChange={(e) =>
              handleChange("volume", parseFloat(e.target.value))
            }
            disabled={!formData.enabled}
          />
          <span className={styles.hint}>Alert playback volume</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Timezone</label>
          <select
            className={styles.select}
            value={formData.timezone || "Australia/Sydney"}
            onChange={(e) => handleChange("timezone", e.target.value)}
            disabled={!formData.enabled}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <span className={styles.hint}>For time window calculation</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={isSaving || Object.keys(errors).length > 0}
        >
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <IconCheck size={18} />
              Save Settings
            </>
          )}
        </button>
        <button
          className={styles.btnSecondary}
          onClick={onTest}
          disabled={isTesting || !formData.enabled}
        >
          {isTesting ? (
            "Testing..."
          ) : (
            <>
              <IconBell size={18} />
              Test Alert
            </>
          )}
        </button>
      </div>
    </div>
  );
}
