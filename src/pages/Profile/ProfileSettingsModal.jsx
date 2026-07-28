import { useTheme } from "../../components/ThemeContext.jsx";
import { useCalendarPromptPreference } from "../../components/useCalendarPromptPreference.jsx";

const THEME_OPTIONS = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Системная' },
];

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'every_2_days', label: 'Раз в 2 дня' },
  { value: 'weekly', label: 'Раз в неделю' },
  { value: 'monthly', label: 'Раз в месяц' },
  { value: 'never', label: 'Никогда' },
];

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function ProfileSettingsModal({
  onClose,
  digestPeriod,
  digestDay,
  weeklyDayError,
  setDigestPeriod,
  setDigestDay,
  setWeeklyDayError,
  saveDigestPeriod,
}) {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { skipPrompt, setSkipPrompt, isPending: isCalendarPromptPending } = useCalendarPromptPreference();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Настройки</h3>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className="filter-section__title">Оформление</h3>
          </div>
          <div className="profile_chips-container">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                className={`profile_chip ${themeMode === value ? 'profile_chip-active' : ''}`}
                onClick={() => setThemeMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <h3 className="filter-section__title">Периодичность дайджеста</h3>
          </div>
          <div className="profile_chips-container">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                className={`profile_chip ${digestPeriod === value ? 'profile_chip-active' : ''}`}
                onClick={() => {
                  setDigestPeriod(value);
                  if (value !== 'weekly') {
                    setDigestDay(null);
                    setWeeklyDayError(false);
                    saveDigestPeriod(value, null);
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {digestPeriod === 'weekly' && (
            <div className="digest-day-picker">
              <p className="digest-day-picker__label">День недели</p>
              <div className="digest-weekdays">
                {WEEKDAY_LABELS.map((dayLabel, idx) => (
                  <button
                    key={idx}
                    className={`profile_chip ${digestDay === idx ? 'profile_chip-active' : ''}`}
                    onClick={() => {
                      setDigestDay(idx);
                      setWeeklyDayError(false);
                      saveDigestPeriod('weekly', idx);
                    }}
                  >
                    {dayLabel}
                  </button>
                ))}
              </div>
              {weeklyDayError && (
                <p className="digest-day-picker__error">Выберите день недели</p>
              )}
            </div>
          )}
        </div>

        <div className="calendar-subsection">
          <label className="calendar-prompt-toggle">
            <input
              type="checkbox"
              checked={!skipPrompt}
              onChange={(e) => setSkipPrompt(!e.target.checked)}
              disabled={isCalendarPromptPending}
            />
            Предлагать добавить во внешний календарь при сохранении события
          </label>
        </div>

        <div className="modal-actions">
          <button className="modal-confirm-btn" onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}
