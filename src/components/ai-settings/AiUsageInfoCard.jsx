function AiUsageInfoCard({ icon: Icon, title, description, items }) {
  return (
    <article className="ai-info-card">
      <div className="ai-info-icon">
        <Icon size={24} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>

        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default AiUsageInfoCard;