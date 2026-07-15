function AccountingPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="accounting-pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        Önceki
      </button>

      <span>
        Sayfa {page} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Sonraki
      </button>
    </div>
  );
}

export default AccountingPagination;
