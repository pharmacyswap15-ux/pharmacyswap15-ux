export default function MarketLoading() {
  return (
    <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-5">
      <div className="mb-3 h-6 w-40 animate-pulse rounded-sm bg-line" />
      <div className="mb-3 h-9 w-full animate-pulse rounded-sm bg-line" />
      <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[62px] bg-surface px-3 py-2">
            <div className="mb-2 h-2 w-16 animate-pulse rounded-full bg-line" />
            <div className="h-4 w-20 animate-pulse rounded-sm bg-line" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-[292px] animate-pulse rounded-md border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
