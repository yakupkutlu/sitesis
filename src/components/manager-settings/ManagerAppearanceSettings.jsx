import { Moon, Palette, Save, Sun } from "lucide-react";

const themeOptions = ["Açık Tema", "Koyu Tema"];
const cardDensityOptions = ["Rahat", "Kompakt"];

function ManagerAppearanceSettings({
  appearanceData,
  onAppearanceChange,
  onSaveAppearance,
}) {
  return (
    <section className="manager-settings-card">
      <div className="manager-settings-card-header">
        <div>
          <span className="section-kicker">Görünüm</span>

          <h3>Görünüm Ayarları</h3>

          <p>
            Yönetici panelinin görünüm tercihlerini buradan
            düzenleyebilirsiniz.
          </p>
        </div>

        <div className="manager-settings-card-icon">
          <Palette size={22} />
        </div>
      </div>

      <form className="manager-settings-form" onSubmit={onSaveAppearance}>
        <div className="form-grid">
          <label>
            Tema
            <select
              name="themeMode"
              value={appearanceData.themeMode}
              onChange={onAppearanceChange}
            >
              {themeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Kart Yoğunluğu
            <select
              name="cardDensity"
              value={appearanceData.cardDensity}
              onChange={onAppearanceChange}
            >
              {cardDensityOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="manager-appearance-preview">
          <div className="manager-appearance-preview-card">
            <Sun size={18} />
            <span>Açık Tema</span>
          </div>

          <div className="manager-appearance-preview-card">
            <Moon size={18} />
            <span>Koyu Tema</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="dashboard-action-button">
            <Save size={18} />
            Görünümü Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManagerAppearanceSettings;