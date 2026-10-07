import type { ReactNode } from "react";

// Loading, empty and error states shared by every screen, so nothing is ever plain "Loading..." text.
export const Skeleton = ({ w = "100%", h = 16, r = 8 }: { w?: number | string; h?: number; r?: number }) =>
  <span className="skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="list" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="item">
          <Skeleton w="55%" h={18} /><Skeleton w="38%" h={12} />
          <span className="chips static"><Skeleton w={64} h={26} r={999} /><Skeleton w={64} h={26} r={999} /></span>
        </div>
      ))}
    </div>
  );
}

// The locate screen's shape while the layout loads: header, target card, map.
export function LocateSkeleton({ title }: { title?: string }) {
  return (
    <>
      <header className="app">
        <span className="back" aria-hidden="true">‹</span>
        {title ? <span className="brand title-ellipsis">{title}</span> : <Skeleton w="45%" h={20} />}
        <Skeleton w={96} h={30} r={999} />
      </header>
      <main role="status" aria-label="Loading layout">
        <section className="card hero"><Skeleton w="50%" h={20} /><Skeleton w={200} h={200} r={999} /><Skeleton w="40%" h={44} /></section>
        <section className="card plan"><Skeleton h={300} r={12} /></section>
      </main>
    </>
  );
}

// A thin bar across the top while data is refreshing in the background.
export const TopProgress = ({ active }: { active: boolean }) => (active ? <div className="progress" role="progressbar" aria-label="Updating" /> : null);

export const SlowNote = ({ show }: { show: boolean }) =>
  show ? <p className="note fade">Still connecting. The server may be waking up, this can take a few seconds.</p> : null;

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card state fade" role="alert">
      <span className="stateicon bad" aria-hidden="true">!</span>
      <b>Something went wrong</b>
      <p className="note">{message}</p>
      {onRetry && <button className="btn primary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card state fade">
      <span className="stateicon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="26" height="26"><path d="M10 46 L26 30 L40 36 L54 16" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <b>{title}</b>
      <p className="note">{text}</p>
      {action}
    </div>
  );
}
