"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicChoice } from "@/lib/questions/public";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { mapping: Record<string, string> };

function plain(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
}

function DraggableItem({ item, disabled }: { item: PublicChoice; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `item:${item.id}`, disabled });
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("cursor-grab touch-none rounded-md border border-border bg-background px-3 py-2 shadow-sm", isDragging && "z-10 opacity-80 shadow-lg")}
      {...listeners}
      {...attributes}
    >
      <Html html={item.html} inline />
    </li>
  );
}

function Target({ target, children }: { target: PublicChoice; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `target:${target.id}` });
  return (
    <li ref={setNodeRef} className={cn("rounded-md border border-border p-3", isOver && "border-primary bg-blue-50")}>
      <div className="mb-2 font-medium"><Html html={target.html} inline /></div>
      {children}
    </li>
  );
}

/**
 * Drag items onto targets (mouse, touch, or keyboard: Space to pick up, arrows,
 * Space to drop). Every target also offers a drop-down list, which is the
 * accessible alternative and the main input on small screens.
 */
export function DragDropInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"dragdrop">, R>) {
  const t = useTranslations("question");
  const mapping = response?.mapping ?? {};
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor), useSensor(KeyboardSensor));
  const used = new Set(Object.values(mapping));
  const pool = body.reuse ? body.items : body.items.filter((i) => !used.has(i.id));

  const assign = (targetId: string, itemId: string | null) => {
    const next = { ...mapping };
    if (!itemId) delete next[targetId];
    else {
      if (!body.reuse) for (const [k, v] of Object.entries(next)) if (v === itemId) delete next[k];
      next[targetId] = itemId;
    }
    onChange(Object.keys(next).length ? { mapping: next } : null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    assign(String(over.id).slice("target:".length), String(active.id).slice("item:".length));
  };

  return (
    <DndContext id={uid} sensors={sensors} onDragEnd={onDragEnd} accessibility={{ screenReaderInstructions: { draggable: t("dragInstructions") } }}>
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby={`${uid}-pool`} className="hidden md:block">
          <h3 id={`${uid}-pool`} className="mb-2 text-sm font-semibold">{t("items")}</h3>
          <ul className="flex min-h-12 flex-col gap-2 rounded-md bg-muted p-3">
            {pool.map((i) => <DraggableItem key={i.id} item={i} disabled={disabled} />)}
          </ul>
        </section>
        <section aria-labelledby={`${uid}-targets`}>
          <h3 id={`${uid}-targets`} className="mb-2 text-sm font-semibold">{t("answerArea")}</h3>
          <ul className="flex flex-col gap-2">
            {body.targets.map((target) => {
              const current = body.items.find((i) => i.id === mapping[target.id]);
              return (
                <Target key={target.id} target={target}>
                  {current && (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-primary bg-blue-50 px-3 py-2">
                      <Html html={current.html} inline />
                      <button type="button" disabled={disabled} onClick={() => assign(target.id, null)} className="text-xs underline">
                        {t("remove")}
                      </button>
                    </div>
                  )}
                  <select
                    aria-label={t("chooseFor", { target: plain(target.html) })}
                    value={mapping[target.id] ?? ""}
                    disabled={disabled}
                    onChange={(e) => assign(target.id, e.target.value || null)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">{t("choose")}</option>
                    {body.items.map((i) => (
                      <option key={i.id} value={i.id}>{plain(i.html)}</option>
                    ))}
                  </select>
                </Target>
              );
            })}
          </ul>
        </section>
      </div>
    </DndContext>
  );
}
