import { CheckCircle2, Eye, EyeOff, MessageSquare, Send } from "lucide-react";
import { useState } from "react";

const providerOptions = [
  { value: "NETGSM", label: "Netgsm" },
  { value: "ILETIMERKEZI", label: "İleti Merkezi" },
  { value: "TWILIO", label: "Twilio" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "PASSIVE", label: "Pasif" },
];

function SmsSettingsForm({
  formData,
  onInputChange,
  onSubmit,
  onTestSms,
  isSaving = false,
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  return (
    <section className="notification-settings-card">
      <div className="notification-card-header">
        <div className="notification-card-title">
          <div className="notification-card-icon">
            <MessageSquare size={22} />
          </div>

          <div>
            <span className="section-kicker">SMS Ayarları</span>
            <h3>{formData.id ? "SMS Ayarını Düzenle" : "Yeni SMS Ayarı"}</h3>
          </div>
        </div>

        <span
          className={`notification-status-badge ${
            formData.status === "ACTIVE" ? "active" : "passive"
          }`}
        >
          {formData.status === "ACTIVE" ? "Aktif" : "Pasif"}
        </span>
      </div>

      <p className="notification-card-description">
        SMS sağlayıcısı, gönderici başlığı, son kullanım tarihi ve gizli API
        bilgileri tanımlanır.
      </p>

      <form className="notification-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            SMS Sağlayıcı
            <select
              name="provider"
              value={formData.provider}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {providerOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Durum
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              disabled={isSaving}
            >
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Son Kullanım Tarihi
            <input
              name="expiresAt"
              type="date"
              value={formData.expiresAt}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Gönderici Başlığı
            <input
              name="senderName"
              type="text"
              placeholder="Örn: SITESIS"
              value={formData.senderName}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            From Phone
            <input
              name="fromPhone"
              type="text"
              placeholder="+90 5xx xxx xx xx"
              value={formData.fromPhone}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Kullanıcı Adı
            <input
              name="username"
              type="text"
              placeholder={
                formData.hasUsername
                  ? "Mevcut kullanıcı adı kayıtlı"
                  : "API kullanıcı adı"
              }
              value={formData.username}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            Şifre
            <input
              name="password"
              type="password"
              placeholder={
                formData.hasPassword ? "Mevcut şifre kayıtlı" : "API şifresi"
              }
              value={formData.password}
              onChange={onInputChange}
              disabled={isSaving}
            />
          </label>

          <label>
            API Key
            <div className="secret-input-wrapper">
              <input
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder={
                  formData.hasApiKey ? "Mevcut API key kayıtlı" : "API key"
                }
                value={formData.apiKey}
                onChange={onInputChange}
                disabled={isSaving}
              />

              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                aria-label="API key görünürlüğünü değiştir"
                disabled={isSaving}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            API Secret / Auth Token
            <div className="secret-input-wrapper">
              <input
                name="apiSecret"
                type={showApiSecret ? "text" : "password"}
                placeholder={
                  formData.hasApiSecret
                    ? "Mevcut secret kayıtlı"
                    : "API secret veya auth token"
                }
                value={formData.apiSecret}
                onChange={onInputChange}
                disabled={isSaving}
              />

              <button
                type="button"
                onClick={() => setShowApiSecret((current) => !current)}
                aria-label="API secret görünürlüğünü değiştir"
                disabled={isSaving}
              >
                {showApiSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>

        <div className="notification-form-actions">

          <button
            type="button"
            className="secondary-form-button"
            onClick={onTestSms}
            disabled={isSaving}
          >
            <Send size={17} />
            Test SMS Gönder
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <CheckCircle2 size={18} />
            {isSaving
              ? "Kaydediliyor..."
              : formData.id
                ? "SMS Ayarını Güncelle"
                : "SMS Ayarını Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default SmsSettingsForm;
