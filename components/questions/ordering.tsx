"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicChoice } from "@/lib/questions/public";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { sequence: string[] };

function SortableStep({ item, index, count, disabled, onMove, onRemove }: Readonly<{
  item: PublicChoice; index: number; count: number; disabled?: boolean;
  onMove: (from: number, to: number) => void; onRemove: () => void;
}>) {
  const t = useTranslations("question");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-md border border-primary bg-blue-50 px-2 py-2", isDragging && "z-10 shadow-lg")}
    >
      <span className="cursor-grab touch-none px-1 text-muted-foreground" aria-label={t("reorderHandle")} {...listeners} {...attributes}>⠿</span>
      <span className="font-semibold">{index + 1}.</span>
      <Html html={item.html} inline className="flex-1" />
      <button type="button" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp")} className="rounded px-2 hover:bg-muted disabled:opacity-30">↑</button>
      <button type="button" disabled={disabled || index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown")} className="rounded px-2 hover:bg-muted disabled:opacity-30">↓</button>
      <button type="button" disabled={disabled} onClick={onRemove} aria-label={t("remove")} className="rounded px-2 hover:bg-muted">✕</button>
    </li>
  );
}

/**
 * Build a sequence: add actions to the answer area, then reorder them with the
 * arrow buttons, by dragging, or with the keyboard on the handle.
 */
export function OrderingInput({ body, response, onChange, disabled, uid }: Readonly<QuestionInputProps<BodyOf<"ordering">, R>>) {
  const t = useTranslations("question");
  const sequence = response?.sequence ?? [];
  const byId = new Map(body.actions.map((a) => [a.id, a]));
  const available = body.actions.filter((a) => !sequence.includes(a.id));
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const set = (next: string[]) => onChange(next.length ? { sequence: next } : null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    set(arrayMove(sequence, sequence.indexOf(String(active.id)), sequence.indexOf(String(over.id))));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby={`${uid}-actions`}>
        <h3 id={`${uid}-actions`} className="mb-2 text-sm font-semibold">{t("actions")}</h3>
        <ul className="flex flex-col gap-2">
          {available.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Html html={a.html} inline className="flex-1" />
              <button
                type="button"
                disabled={disabled || sequence.length >= body.count}
                onClick={() => set([...sequence, a.id])}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
              >
                {t("add")} →
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={`${uid}-answer`}>
        <h3 id={`${uid}-answer`} className="mb-2 text-sm font-semibold">
          {t("answerArea")} <span className="font-normal text-muted-foreground">({t("orderCount", { count: sequence.length, n: body.count })})</span>
        </h3>
        <DndContext id={uid} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sequence} strategy={verticalListSortingStrategy}>
            <ol className="flex min-h-12 flex-col gap-2 rounded-md bg-muted p-3">
              {sequence.map((id, index) => {
                const item = byId.get(id);
                return item ? (
                  <SortableStep
                    key={id}
                    item={item}
                    index={index}
                    count={sequence.length}
                    disabled={disabled}
                    onMove={(from, to) => set(arrayMove(sequence, from, to))}
                    onRemove={() => set(sequence.filter((x) => x !== id))}
                  />
                ) : null;
              })}
            </ol>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
