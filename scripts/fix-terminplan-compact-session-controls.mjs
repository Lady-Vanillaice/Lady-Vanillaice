import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.terminplan.tsx";
let source = readFileSync(path, "utf8");

const oldBlock = `                      <EntryCard e={e} />
                      {!isPureCustomContent(e) && (
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" disabled={bookingTypeMut.isPending || !e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: false })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${!e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                            {!e.is_duo ? "✓ Single" : "Als Single setzen"}
                          </button>
                          <button type="button" disabled={bookingTypeMut.isPending || e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: true })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                            {e.is_duo ? "✓ Duo" : "Als Duo setzen"}
                          </button>
                        </div>
                      )}
                      {!isPureCustomContent(e) && (
                        <button type="button" disabled={sessionCustomMut.isPending} onClick={() => sessionCustomMut.mutate({ id: e.id, enabled: !e.is_content_shoot })} className={\`w-full border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-40 \${e.is_content_shoot ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                          {e.is_content_shoot ? "✓ Custom für diese Session vorgemerkt · entfernen" : "+ Custom für diese Session vormerken"}
                        </button>
                      )}`;

const newBlock = `                      <EntryCard e={e} />
                      {!isPureCustomContent(e) && (
                        <details className="border border-champagne/15 bg-anthracite/20">
                          <summary className="cursor-pointer list-none px-3 py-2 text-[0.62rem] uppercase tracking-[0.16em] text-champagne hover:bg-champagne/5 flex items-center justify-between gap-3">
                            <span>Terminart & Custom ändern</span>
                            <span className="text-vanilla/40 normal-case tracking-normal">antippen</span>
                          </summary>
                          <div className="space-y-2 border-t border-champagne/15 p-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" disabled={bookingTypeMut.isPending || !e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: false })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${!e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                                {!e.is_duo ? "✓ Single" : "Als Single setzen"}
                              </button>
                              <button type="button" disabled={bookingTypeMut.isPending || e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: true })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                                {e.is_duo ? "✓ Duo" : "Als Duo setzen"}
                              </button>
                            </div>
                            <button type="button" disabled={sessionCustomMut.isPending} onClick={() => sessionCustomMut.mutate({ id: e.id, enabled: !e.is_content_shoot })} className={\`w-full border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-40 \${e.is_content_shoot ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>
                              {e.is_content_shoot ? "✓ Custom vorgemerkt · entfernen" : "+ Custom vormerken"}
                            </button>
                          </div>
                        </details>
                      )}`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  writeFileSync(path, source);
} else if (!source.includes("Terminart & Custom ändern")) {
  throw new Error("Terminplan compact-controls target was not found");
}

console.log("Terminplan session controls are compact and expandable.");
