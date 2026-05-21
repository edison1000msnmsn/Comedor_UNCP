export default function LoadingSpinner({ text = "Cargando", size = "md" }) {
  return (
    <div className="loading-wrap">
      <span className={`spinner spinner-${size}`} />
      {text && <span>{text}</span>}
    </div>
  );
}
