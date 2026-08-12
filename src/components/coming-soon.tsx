export function ComingSoon({ title, phase, note }: { title: string; phase: number; note?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <div className="font-sans text-lg font-semibold text-ink">{title}</div>
        <div className="mt-2 font-sans text-[15px] leading-[1.6] text-ink-muted">
          {note ?? `This screen is built in phase ${phase} of the project backlog.`}
        </div>
      </div>
    </div>
  );
}
