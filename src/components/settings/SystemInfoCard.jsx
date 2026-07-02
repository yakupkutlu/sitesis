function SystemInfoCard({ icon: Icon, title, description, items }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <article className="system-info-card">
      {Icon && (
        <div className="system-info-icon">
          <Icon size={24} />
        </div>
      )}

      <div>
        <h3>{title || "Bilgi Kartı"}</h3>

        <p>{description || "Bu bölüm için açıklama tanımlanmamış."}</p>

        {safeItems.length > 0 && (
          <ul>
            {safeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default SystemInfoCard;