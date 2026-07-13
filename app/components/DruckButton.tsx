type DruckButtonProps = {
  text?: string;
};

export default function DruckButton({
  text = "Lieferschein drucken",
}: DruckButtonProps) {
  function drucken() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={drucken}
      className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
    >
      🖨️ {text}
    </button>
  );
}