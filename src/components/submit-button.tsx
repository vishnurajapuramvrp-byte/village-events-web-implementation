"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: ButtonProps["variant"] }) {
  const { pending } = useFormStatus();
  const { locale } = useLocale();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? translate("Saving…", locale) : children}
    </Button>
  );
}
