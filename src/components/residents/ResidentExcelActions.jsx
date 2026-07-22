import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import { downloadResidentExcelTemplate } from "../../api/apartmentResidentsApi";


function ResidentExcelActions({ onOpenImport, disabled = false }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownloadTemplate() {
    try {
      setIsDownloading(true);
      await downloadResidentExcelTemplate();
    } catch (error) {
      window.alert(error?.message ?? "Excel şablonu indirilemedi.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="secondary-form-button resident-excel-header-button"
        onClick={handleDownloadTemplate}
        disabled={disabled || isDownloading}
        aria-label="Yetkiye göre hazırlanmış sakin Excel şablonunu indir"
      >
        <Download size={18} />
        {isDownloading ? "Hazırlanıyor..." : "Şablonu İndir"}
      </button>

      <button
        type="button"
        className="secondary-form-button resident-excel-header-button"
        onClick={onOpenImport}
        disabled={disabled}
      >
        <FileSpreadsheet size={18} />
        Excel'den Yükle
      </button>
    </>
  );
}

export default ResidentExcelActions;
