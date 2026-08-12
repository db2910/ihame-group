"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { voidSaleAction, type VoidSaleFormState } from "../actions";

export function VoidSaleModal({ saleId, saleNo }: { saleId: string; saleNo: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<VoidSaleFormState, FormData>(
    async (prevState, formData) => {
      const result = await voidSaleAction(prevState, formData);
      if (result && "success" in result) {
        showToast(`${saleNo} voided`);
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer font-sans text-[12.5px] font-medium text-alert hover:underline"
      >
        Void
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Void ${saleNo}`}
        footer={
          <button
            type="submit"
            form="void-sale-form"
            disabled={pending}
            className="h-11 w-full cursor-pointer rounded bg-alert font-sans text-base font-semibold text-white disabled:opacity-70"
          >
            {pending ? "Voiding…" : "Void sale"}
          </button>
        }
      >
        <form id="void-sale-form" action={action} className="flex flex-col gap-3">
          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[14px] text-warning-text">
              {state.error}
            </div>
          )}
          <input type="hidden" name="saleId" value={saleId} />
          <div className="font-sans text-[13px] leading-[1.5] text-ink-faint">
            This reverses the sale&rsquo;s stock movements and marks it voided. It can&rsquo;t be undone or edited
            afterward.
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase">
              Reason
            </label>
            <textarea
              name="reason"
              required
              minLength={5}
              rows={3}
              className="focus-ring-brand w-full resize-none rounded border border-input-border px-3 py-2 font-sans text-base text-ink outline-none md:text-sm"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
