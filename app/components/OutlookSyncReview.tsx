"use client";

import type { OutlookSyncPreview } from "@/lib/outlook-sync";

export function OutlookSyncReview({
  preview,
  busy,
  onClose,
  onPublish,
}: {
  preview: OutlookSyncPreview;
  busy: boolean;
  onClose: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="sync-review-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="sync-review-dialog" role="dialog" aria-modal="true" aria-labelledby="sync-review-title">
        <header>
          <div>
            <p className="eyebrow">Outlook change review</p>
            <h2 id="sync-review-title">Review before uploading</h2>
            <p>Only the dedicated LSS 2027 Demo Calendar will be changed.</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close Outlook review">×</button>
        </header>
        <div className="sync-review-counts">
          <div><strong>{preview.createCount}</strong><span>Create</span></div>
          <div><strong>{preview.updateCount}</strong><span>Update</span></div>
          <div><strong>{preview.deleteCount}</strong><span>Delete</span></div>
          <div><strong>{preview.unchanged}</strong><span>Already current</span></div>
        </div>
        <div className="sync-review-list">
          {preview.changes.length ? preview.changes.map((change, index) => (
            <article className={`sync-change ${change.action}`} key={`${change.action}-${change.outlookEventId ?? change.plannerEventId ?? index}`}>
              <span>{change.action}</span>
              <div><strong>{change.title}</strong><small>{change.date} · {change.detail}</small></div>
            </article>
          )) : (
            <div className="sync-review-empty">No Outlook changes are waiting. The demo calendar already matches the approved plan.</div>
          )}
        </div>
        {preview.deleteCount > 0 && (
          <p className="sync-delete-note">Deleting an Outlook meeting that has attendees may send them a cancellation notice.</p>
        )}
        <footer>
          <button className="button ghost" type="button" disabled={busy} onClick={onClose}>Back to calendar</button>
          <button className="button primary" type="button" disabled={busy || preview.changes.length === 0} onClick={onPublish}>
            {busy ? "Uploading changes…" : `Upload ${preview.changes.length} change${preview.changes.length === 1 ? "" : "s"} to Outlook`}
          </button>
        </footer>
      </section>
    </div>
  );
}
