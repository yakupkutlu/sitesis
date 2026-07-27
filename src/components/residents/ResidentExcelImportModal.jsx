import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCcw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  commitResidentExcelImport,
  previewResidentExcelImport,
  validateResidentExcelImport,
} from "../../api/apartmentResidentsApi";


const countryCodeOptions = [
  "+90 Türkiye",
  "+963 Suriye",
  "+964 Irak",
  "+98 İran",
  "+994 Azerbaycan",
  "+995 Gürcistan",
  "+44 Birleşik Krallık",
  "+49 Almanya",
  "+33 Fransa",
  "+31 Hollanda",
  "+32 Belçika",
  "+43 Avusturya",
  "+41 İsviçre",
  "+39 İtalya",
  "+34 İspanya",
  "+1 ABD / Kanada",
  "+7 Rusya / Kazakistan",
  "+380 Ukrayna",
  "+40 Romanya",
  "+359 Bulgaristan",
  "+30 Yunanistan",
  "+966 Suudi Arabistan",
  "+971 Birleşik Arap Emirlikleri",
  "+974 Katar",
  "+965 Kuveyt",
  "+961 Lübnan",
  "+962 Ürdün",
  "+20 Mısır",
  "+212 Fas",
  "+213 Cezayir",
  "+216 Tunus",
  "+218 Libya",
  "+92 Pakistan",
  "+91 Hindistan",
  "+93 Afganistan",
  "+86 Çin",
  "+81 Japonya",
];

function getResponseData(result) {
  return result?.data ?? result ?? {};
}

function toEditableRows(rows = []) {
  return rows.map((row, index) => ({
    rowNumber: Number(row.rowNumber) || index + 1,
    countryCode: row.countryCode ?? "",
    fullName: row.fullName ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    residentType: row.residentType ?? "",
    siteName: row.siteName ?? "",
    blockName: row.blockName ?? "",
    apartmentNumber: row.apartmentNumber ?? "",
    password: row.password ?? "",
    apartmentId: row.apartmentId ?? null,
    status: row.status ?? "UNVALIDATED",
    errors: Array.isArray(row.errors) ? row.errors : [],
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    action: row.action ?? "Kontrol edilmedi",
    accountState: row.accountState ?? null,
  }));
}

function toRequestRows(rows) {
  return rows.map((row, index) => ({
    rowNumber: Number(row.rowNumber) || index + 1,
    countryCode: String(row.countryCode ?? ""),
    fullName: String(row.fullName ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    residentType: String(row.residentType ?? ""),
    siteName: String(row.siteName ?? ""),
    blockName: String(row.blockName ?? ""),
    apartmentNumber: String(row.apartmentNumber ?? ""),
    password: String(row.password ?? ""),
  }));
}

function getStatusLabel(row) {
  if (row.status === "VALID" && row.warnings.length > 0) {
    return "Uyarılı / Geçerli";
  }

  if (row.status === "VALID") return "Geçerli";
  if (row.status === "ERROR") return "Hatalı";
  if (row.status === "SKIP") return "Zaten Kayıtlı";
  return "Tekrar Kontrol Et";
}

function getStatusVisualClass(row) {
  if (row.status === "VALID" && row.warnings.length > 0) {
    return "warning";
  }

  return row.status.toLowerCase();
}

function ResidentExcelImportModal({ open, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const summary = useMemo(() => {
    return {
      total: rows.length,
      valid: rows.filter((row) => row.status === "VALID").length,
      error: rows.filter((row) => row.status === "ERROR").length,
      skip: rows.filter((row) => row.status === "SKIP").length,
      warning: rows.filter(
        (row) => row.status === "VALID" && row.warnings.length > 0
      ).length,
      unvalidated: rows.filter(
        (row) => !["VALID", "ERROR", "SKIP"].includes(row.status)
      ).length,
    };
  }, [rows]);

  const isBusy = isReading || isValidating || isImporting;
  const canCommit =
    rows.length > 0 &&
    summary.error === 0 &&
    summary.unvalidated === 0 &&
    summary.valid > 0 &&
    !isBusy;

  function resetModal() {
    setFileName("");
    setRows([]);
    setMessage("");
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeModal() {
    if (isBusy) {
      return;
    }

    resetModal();
    onClose();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Excel dosyası en fazla 2 MB olabilir.");
      event.target.value = "";
      return;
    }

    try {
      setIsReading(true);
      setErrorMessage("");
      setMessage("");
      setRows([]);
      setFileName(file.name);

      const result = await previewResidentExcelImport(file);
      const data = getResponseData(result);

      setRows(toEditableRows(data.rows));
      setMessage(
        result?.message ??
          "Excel dosyası okundu. Satırları kontrol edip hataları düzeltin."
      );
    } catch (error) {
      setErrorMessage(error?.message ?? "Excel dosyası okunamadı.");
      setFileName("");
    } finally {
      setIsReading(false);
    }
  }

  function handleRowChange(rowIndex, fieldName, value) {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [fieldName]: value,
              status: "UNVALIDATED",
              errors: [],
              warnings: [],
              action: "Değişiklik sonrası tekrar kontrol edilmeli",
              apartmentId: null,
            }
          : row
      )
    );
    setMessage("");
    setErrorMessage("");
  }

  function handleDeleteRow(rowIndex) {
    setRows((currentRows) =>
      currentRows
        .filter((_row, index) => index !== rowIndex)
        .map((row) => ({
          ...row,
          status: "UNVALIDATED",
          errors: [],
          warnings: [],
          action: "Satır silindiği için tekrar kontrol edilmeli",
          apartmentId: null,
        }))
    );
    setMessage("Satır listeden kaldırıldı. Kalan satırları tekrar kontrol edin.");
    setErrorMessage("");
  }

  async function handleValidate() {
    if (rows.length === 0) {
      setErrorMessage("Kontrol edilecek sakin satırı bulunmuyor.");
      return;
    }

    try {
      setIsValidating(true);
      setMessage("");
      setErrorMessage("");

      const result = await validateResidentExcelImport(toRequestRows(rows));
      const data = getResponseData(result);

      setRows(toEditableRows(data.rows));
      setMessage(result?.message ?? "Satırlar tekrar kontrol edildi.");
    } catch (error) {
      const details = error?.details?.errors;

      if (Array.isArray(details?.rows)) {
        setRows(toEditableRows(details.rows));
      }

      setErrorMessage(error?.message ?? "Satırlar kontrol edilemedi.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleCommit() {
    if (!canCommit) {
      setErrorMessage(
        "Önce tüm hatalı veya değiştirilmiş satırları kontrol edin."
      );
      return;
    }

    const warningText =
      summary.warning > 0 ? ` (${summary.warning} sarı uyarılı)` : "";
    const confirmed = window.confirm(
      `${summary.valid} geçerli sakin satırı${warningText} kaydedilecek. Devam etmek istiyor musunuz?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsImporting(true);
      setMessage("");
      setErrorMessage("");

      const result = await commitResidentExcelImport(toRequestRows(rows));

      await onImported?.(result);
      resetModal();
      onClose();
    } catch (error) {
      const details = error?.details?.errors;

      if (Array.isArray(details?.rows)) {
        setRows(toEditableRows(details.rows));
      }

      setErrorMessage(error?.message ?? "Sakinler toplu olarak kaydedilemedi.");
    } finally {
      setIsImporting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="resident-import-modal-overlay" role="presentation">
      <section
        className="resident-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-import-title"
      >
        <div className="resident-import-modal-header">
          <div>
            <span className="section-kicker">Toplu Sakin İşlemi</span>
            <h3 id="resident-import-title">Excel'den Kiracı / Ev Sahibi Yükle</h3>
            <p>
              Dosyayı yükleyin, kırmızı satırları tabloda düzeltin ve tekrar
              kontrol edin. Sarı uyarılı satırlar geçerlidir ve toplu kayıt
              işlemine dahil edilebilir.
            </p>
          </div>

          <button
            type="button"
            className="resident-import-close-button"
            onClick={closeModal}
            disabled={isBusy}
            aria-label="Excel yükleme penceresini kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="resident-import-file-panel">
          <div>
            <FileSpreadsheet size={24} />
            <div>
              <strong>{fileName || "Henüz Excel dosyası seçilmedi"}</strong>
              <span>XLSX veya XLS / En fazla 2 MB / En fazla 250 satır</span>
            </div>
          </div>

          <label className="dashboard-action-button resident-import-file-button">
            <UploadCloud size={18} />
            {isReading ? "Okunuyor..." : "Excel Dosyası Seç"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileChange}
              disabled={isBusy}
            />
          </label>
        </div>

        {errorMessage && (
          <div className="login-error-message resident-import-message">
            <p>{errorMessage}</p>
          </div>
        )}

        {message && (
          <div className="login-success-message resident-import-message">
            <p>{message}</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="resident-import-summary-grid">
              <div>
                <span>Toplam</span>
                <strong>{summary.total}</strong>
              </div>
              <div className="valid">
                <span>Geçerli</span>
                <strong>{summary.valid}</strong>
              </div>
              <div className="warning">
                <span>Uyarılı</span>
                <strong>{summary.warning}</strong>
              </div>
              <div className="error">
                <span>Hatalı</span>
                <strong>{summary.error}</strong>
              </div>
              <div className="skip">
                <span>Zaten Kayıtlı</span>
                <strong>{summary.skip}</strong>
              </div>
              <div className="waiting">
                <span>Tekrar Kontrol</span>
                <strong>{summary.unvalidated}</strong>
              </div>
            </div>

            <div className="resident-import-table-wrapper">
              <table className="resident-import-table">
                <thead>
                  <tr>
                    <th>Satır</th>
                    <th>Ad Soyad</th>
                    <th>E-posta</th>
                    <th>Ülke Kodu</th>
                    <th>Telefon Numarası</th>
                    <th>Kayıt Tipi</th>
                    <th>Site</th>
                    <th>Blok / Apartman</th>
                    <th>Daire No</th>
                    <th>Geçici Şifre</th>
                    <th>Kontrol</th>
                    <th>İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={`${row.rowNumber}-${rowIndex}`}
                      className={`resident-import-row ${getStatusVisualClass(row)}`}
                    >
                      <td>
                        <strong>{row.rowNumber}</strong>
                      </td>
                      <td>
                        <input
                          value={row.fullName}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "fullName",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={row.email}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "email",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <select
                          value={row.countryCode}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "countryCode",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        >
                          <option value="">Ülke kodu seçin</option>
                          {countryCodeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          inputMode="tel"
                          value={row.phone}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "phone",
                              event.target.value
                            )
                          }
                          placeholder="0532 123 45 67"
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <select
                          value={row.residentType}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "residentType",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        >
                          <option value="">Seçiniz</option>
                          <option value="OWNER">Ev Sahibi</option>
                          <option value="TENANT">Kiracı</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={row.siteName}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "siteName",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <input
                          value={row.blockName}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "blockName",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <input
                          value={row.apartmentNumber}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "apartmentNumber",
                              event.target.value
                            )
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <input
                          type="password"
                          value={row.password}
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "password",
                              event.target.value
                            )
                          }
                          placeholder={
                            row.accountState === "NEW"
                              ? "En az 8 karakter"
                              : "Mevcut hesapta boş"
                          }
                          disabled={isBusy}
                        />
                      </td>
                      <td>
                        <div className="resident-import-status-cell">
                          <span
                            className={`resident-import-status-badge ${getStatusVisualClass(row)}`}
                          >
                            {row.status === "VALID" && row.warnings.length === 0 ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <AlertTriangle size={14} />
                            )}
                            {getStatusLabel(row)}
                          </span>

                          <small>{row.action}</small>

                          {row.errors.map((error) => (
                            <em key={error} className="error-text">
                              {error}
                            </em>
                          ))}

                          {row.warnings.map((warning) => (
                            <em key={warning} className="warning-text">
                              {warning}
                            </em>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="danger-table-button resident-import-delete-row"
                          onClick={() => handleDeleteRow(rowIndex)}
                          disabled={isBusy}
                          aria-label={`${row.rowNumber}. satırı kaldır`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="resident-import-modal-actions">
          <button
            type="button"
            className="secondary-form-button"
            onClick={closeModal}
            disabled={isBusy}
          >
            Vazgeç
          </button>

          <button
            type="button"
            className="secondary-form-button"
            onClick={handleValidate}
            disabled={rows.length === 0 || isBusy}
          >
            <RefreshCcw size={17} />
            {isValidating ? "Kontrol Ediliyor..." : "Satırları Tekrar Kontrol Et"}
          </button>

          <button
            type="button"
            className="dashboard-action-button"
            onClick={handleCommit}
            disabled={!canCommit}
          >
            <CheckCircle2 size={18} />
            {isImporting
              ? "Tüm Sakinler Kaydediliyor..."
              : `Tüm Geçerli Sakinleri Kaydet (${summary.valid})`}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ResidentExcelImportModal;
