"use client";

import { createContext, startTransition, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { EstadoForm } from "@/lib/form";

const PendienteCtx = createContext(false);

/**
 * Formulario para Server Actions que NO borra lo escrito si hay errores de
 * validación (React 19 reinicia los <form action> tras cada envío).
 */
export function Formulario({
  accion,
  pendiente,
  estado,
  resetAlExito,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  accion: (fd: FormData) => void;
  pendiente: boolean;
  estado?: { ok?: boolean } | undefined;
  resetAlExito?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetAlExito && estado?.ok) ref.current?.reset();
  }, [estado, resetAlExito]);

  return (
    <PendienteCtx.Provider value={pendiente}>
      <form
        ref={ref}
        {...props}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => accion(fd));
        }}
      >
        {children}
      </form>
    </PendienteCtx.Provider>
  );
}

export function BotonEnviar({ children, pendiente, ...props }: ButtonProps & { pendiente?: string }) {
  const { pending } = useFormStatus();
  const enCurso = useContext(PendienteCtx) || pending;
  return (
    <Button type="submit" disabled={enCurso || props.disabled} {...props}>
      {enCurso ? (pendiente ?? "Guardando…") : children}
    </Button>
  );
}

export function MensajeForm({ estado }: { estado: EstadoForm }) {
  if (!estado) return null;
  if (estado.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {estado.error}
      </p>
    );
  }
  if (estado.errores && Object.keys(estado.errores).length > 0) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        Revisa los campos marcados.
      </p>
    );
  }
  if (estado.ok && estado.mensaje) {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{estado.mensaje}</p>;
  }
  return null;
}
