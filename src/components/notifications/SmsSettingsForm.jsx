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

function SecretInput({
  name,
  value,
  placeholder,
  onChange,
  disabled,
  required = false,
  autoComplete = "new-password",
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="secret-input-wrapper">
      <input
        name={name}
        type={isVisible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
      />

      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={`${name} görünürlüğünü değiştir`}
        disabled={disabled}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function getStoredSecretPlaceholder(hasStoredSecret, emptyPlaceholder) {
  return hasStoredSecret ? "Mevcut gizli bilgi kayıtlı" : emptyPlaceholder;
}

function SmsSettingsForm({
  formData,
  onInputChange,
  onSubmit,
  onTestSms,
  isSaving = false,
}) {
  const isNetgsm = formData.provider === "NETGSM";
  const isIletiMerkezi = formData.provider === "ILETIMERKEZI";
  const isTwilio = formData.provider === "TWILIO";

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
        Seçilen sağlayıcıya ait gönderici ve kimlik doğrulama bilgilerini
        tanımlayın. Gizli bilgiler yalnızca backend tarafında şifreli saklanır.
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

          {(isNetgsm || isIletiMerkezi) && (
            <label>
              Gönderici Başlığı
              <input
                name="senderName"
                type="text"
                placeholder="Örn: SITESIS"
                value={formData.senderName}
                onChange={onInputChange}
                disabled={isSaving}
                required
              />
            </label>
          )}

          {isNetgsm && (
            <>
              <label>
                Netgsm Kullanıcı Adı
                <input
                  name="username"
                  type="text"
                  placeholder={
                    formData.hasUsername
                      ? "Mevcut kullanıcı adı kayıtlı"
                      : "Netgsm kullanıcı adı"
                  }
                  value={formData.username}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required={!formData.id && !formData.hasUsername}
                  autoComplete="username"
                />
              </label>

              <label>
                Netgsm Şifre
                <SecretInput
                  name="password"
                  value={formData.password}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasPassword,
                    "Netgsm şifresi"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required={!formData.id && !formData.hasPassword}
                />
              </label>
            </>
          )}

          {isIletiMerkezi && (
            <>
              <label>
                İleti Merkezi API Anahtarı
                <SecretInput
                  name="apiKey"
                  value={formData.apiKey}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasApiKey,
                    "API anahtarı"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required={!formData.id && !formData.hasApiKey}
                />
              </label>

              <label>
                İleti Merkezi API Hash
                <SecretInput
                  name="apiSecret"
                  value={formData.apiSecret}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasApiSecret,
                    "API hash"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required={!formData.id && !formData.hasApiSecret}
                />
              </label>
            </>
          )}

          {isTwilio && (
            <>
              <label>
                Twilio Gönderen Numarası
                <input
                  name="fromPhone"
                  type="tel"
                  placeholder="+905xxxxxxxxx"
                  value={formData.fromPhone}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required
                />
              </label>

              <label>
                Twilio Account SID
                <SecretInput
                  name="accountSid"
                  value={formData.accountSid}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasAccountSid,
                    "Account SID"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                  required={!formData.id && !formData.hasAccountSid}
                />
              </label>

              <label>
                Twilio Auth Token
                <SecretInput
                  name="authToken"
                  value={formData.authToken}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasAuthToken,
                    "Auth Token"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <label>
                Twilio API Key SID
                <SecretInput
                  name="apiKey"
                  value={formData.apiKey}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasApiKey,
                    "API Key SID"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <label>
                Twilio API Key Secret
                <SecretInput
                  name="apiSecret"
                  value={formData.apiSecret}
                  placeholder={getStoredSecretPlaceholder(
                    formData.hasApiSecret,
                    "API Key Secret"
                  )}
                  onChange={onInputChange}
                  disabled={isSaving}
                />
              </label>

              <div className="notification-provider-note full-width">
                <strong>Twilio doğrulama seçeneği</strong>
                <p>
                  Account SID ile birlikte Auth Token kullanabilir veya API Key
                  SID ve API Key Secret bilgilerini birlikte girebilirsiniz.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="notification-form-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onTestSms}
            disabled={isSaving || typeof onTestSms !== "function"}
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