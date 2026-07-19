"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useBenutzer } from "../context/BenutzerContext";

type AppAuthSchutzProps = {
  children: ReactNode;
};

const OEFFENTLICHE_PFADE = [
  "/login",
  "/passwort-zuruecksetzen",
];

export default function AppAuthSchutz({
  children,
}: AppAuthSchutzProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    aktuellerBenutzer,
    istAngemeldet,
    laedt,
    fehler,
  } = useBenutzer();

  const istOeffentlicheSeite =
    OEFFENTLICHE_PFADE.includes(pathname);

  const aktuelleZielseite = useMemo(() => {
    const suchparameter =
      searchParams.toString();

    return suchparameter
      ? `${pathname}?${suchparameter}`
      : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (
      laedt ||
      istOeffentlicheSeite ||
      istAngemeldet
    ) {
      return;
    }

    const loginAdresse =
      `/login?next=${encodeURIComponent(
        aktuelleZielseite,
      )}`;

    router.replace(loginAdresse);
  }, [
    aktuelleZielseite,
    istAngemeldet,
    istOeffentlicheSeite,
    laedt,
    router,
  ]);

  if (istOeffentlicheSeite) {
    return <>{children}</>;
  }

  if (laedt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-950">
            Anmeldung wird geprüft
          </h1>

          <p className="mt-2 text-slate-600">
            Bitte einen Moment warten ...
          </p>
        </div>
      </main>
    );
  }

  if (!istAngemeldet) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-950">
            Weiterleitung zur Anmeldung
          </h1>

          <p className="mt-2 text-slate-600">
            Du musst angemeldet sein, um Wash Cloud zu verwenden.
          </p>
        </div>
      </main>
    );
  }

  if (fehler || !aktuellerBenutzer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-2xl bg-red-100 p-8 text-red-800 shadow">
          <h1 className="text-2xl font-bold">
            Benutzer konnte nicht geladen werden
          </h1>

          <p className="mt-2">
            {fehler ||
              "Das angemeldete Konto ist keinem aktiven Wash-Cloud-Benutzer zugeordnet."}
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}