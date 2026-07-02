import { MonitorCog, Moon, Sun } from "lucide-react";

const themeOptions = ["Açık Tema", "Koyu Tema"];
const cardDensityOptions = ["Rahat", "Kompakt"];

function ResidentAppearanceSettings({ appearanceData, onInputChange }) {
  return (
    <section className="resident-settings-card">
      <div className="resident-settings-card-header">
        <div>
          <span className="section-kicker">Görünüm</span>

          <h3>Tema Ayarları</h3>

          <p>Sakin panelinin görünüm modunu buradan değiştirebilirsiniz.</p>
        </div>

        <div className="resident-settings-card-icon">
          <MonitorCog size={22} />
        </div>
      </div>

      <form className="resident-settings-form">
        <div className="form-grid">
          <label>
            Tema Modu
            <select
              name="themeMode"
              value={appearanceData.themeMode}
              onChange={onInputChange}
            >
              {themeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            Kart Görünümü
            <select
              name="cardDensity"
              value={appearanceData.cardDensity}
              onChange={onInputChange}
            >
              {cardDensityOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="resident-appearance-preview">
          <div className="resident-appearance-preview-card">
            <Sun size={18} />
            <span>Açık Tema</span>
          </div>

          <div className="resident-appearance-preview-card">
            <Moon size={18} />
            <span>Koyu Tema</span>
          </div>
        </div>
      </form>
    </section>
  );
}

export default ResidentAppearanceSettings;