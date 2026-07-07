export default function RecurringScopeDialog({
  actionText,
  onChoice,
}: {
  actionText: string;
  onChoice: (scope: "one" | "series" | null) => void;
}) {
  return (
    <div className="modal-backdrop" onClick={() => onChoice(null)}>
      <div className="modal max-w-[380px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold mb-2">Yinelenen ders</h3>
        <p className="text-sm text-muted mb-5">Bu yinelenen ders nasıl {actionText}?</p>
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={() => onChoice("one")}>
            Sadece bu ders
          </button>
          <button className="btn-danger" onClick={() => onChoice("series")}>
            Tüm seri
          </button>
          <button className="btn" onClick={() => onChoice(null)}>
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
