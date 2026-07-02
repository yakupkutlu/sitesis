import { MessageSquareText } from "lucide-react";

function ResidentOpenRequests({ requests }) {
  return (
    <section className="resident-dashboard-card">
      <div className="resident-card-header">
        <div>
          <span className="section-kicker">Talepler</span>
          <h3>Açık Taleplerim</h3>
        </div>
      </div>

      <div className="resident-list">
        {requests.map((request) => (
          <div className="resident-list-item" key={request.id}>
            <MessageSquareText size={18} />

            <div>
              <strong>{request.title}</strong>
              <span>{request.date}</span>
              <p>
                {request.category} / {request.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ResidentOpenRequests;