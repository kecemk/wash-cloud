"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  BenutzerRolle,
  Berechtigung,
  hatBerechtigung,
  rolleIstGueltig,
} from "../lib/rechte";

type DatenbankAnnahmestelle = {
  id: number;
  name: string;
};

type DatenbankBenutzer = {
  id: number;
  benutzername: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  rolle: string;
  aktiv: boolean;
  annahmestelle_id: number | null;
  auth_user_id: string | null;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
};

export type AktuellerBenutzer = {
  id: number;
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: BenutzerRolle;
  aktiv: boolean;
  annahmestelleId: number | null;
  annahmestelle: string;
  authUserId: string;
};

type BenutzerContextWert = {
  aktuellerBenutzer: AktuellerBenutzer | null;
  benutzer: AktuellerBenutzer[];
  laedt: boolean;
  fehler: string;
  istAngemeldet: boolean;
  benutzerAuswaehlen: (
    benutzerId: number,
  ) => void;
  benutzerNeuLaden: () => Promise<void>;
  abmelden: () => Promise<void>;
  hatAktuellerBenutzerBerechtigung: (
    berechtigung: Berechtigung,
  ) => boolean;
};

type BenutzerProviderProps = {
  children: ReactNode;
};

const BenutzerContext =
  createContext<BenutzerContextWert | null>(
    null,
  );

function einzelnesElementErmitteln<T>(
  wert: T | T[] | null,
): T | null {
  if (Array.isArray(wert)) {
    return wert[0] ?? null;
  }

  return wert;
}

function benutzerUmwandeln(
  daten: DatenbankBenutzer,
): AktuellerBenutzer | null {
  if (
    !rolleIstGueltig(daten.rolle) ||
    !daten.auth_user_id
  ) {
    return null;
  }

  const annahmestelle =
    einzelnesElementErmitteln(
      daten.annahmestellen,
    );

  return {
    id: daten.id,
    benutzername: daten.benutzername,
    vorname: daten.vorname ?? "",
    nachname: daten.nachname ?? "",
    email: daten.email ?? "",
    rolle: daten.rolle,
    aktiv: daten.aktiv,
    annahmestelleId:
      daten.annahmestelle_id,
    annahmestelle:
      annahmestelle?.name ??
      "Keine Annahmestelle",
    authUserId:
      daten.auth_user_id,
  };
}

export function BenutzerProvider({
  children,
}: BenutzerProviderProps) {
  const [
    aktuellerBenutzer,
    setAktuellerBenutzer,
  ] = useState<AktuellerBenutzer | null>(
    null,
  );

  const [
    authBenutzer,
    setAuthBenutzer,
  ] = useState<User | null>(null);

  const [laedt, setLaedt] =
    useState(true);

  const [fehler, setFehler] =
    useState("");

  useEffect(() => {
    let istAktiv = true;

    async function sitzungLaden() {
      setLaedt(true);
      setFehler("");

      const {
        data: sitzungsDaten,
        error,
      } = await supabase.auth.getSession();

      if (!istAktiv) {
        return;
      }

      if (error) {
        console.error(
          "Die Sitzung konnte nicht geladen werden:",
          error,
        );

        setFehler(error.message);
        setAuthBenutzer(null);
        setAktuellerBenutzer(null);
        setLaedt(false);
        return;
      }

      const angemeldeterAuthBenutzer =
        sitzungsDaten.session?.user ??
        null;

      setAuthBenutzer(
        angemeldeterAuthBenutzer,
      );

      await internenBenutzerLaden(
        angemeldeterAuthBenutzer,
        istAktiv,
      );
    }

    void sitzungLaden();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_ereignis, sitzung) => {
        const angemeldeterAuthBenutzer =
          sitzung?.user ?? null;

        setAuthBenutzer(
          angemeldeterAuthBenutzer,
        );

        void internenBenutzerLaden(
          angemeldeterAuthBenutzer,
          istAktiv,
        );
      },
    );

    return () => {
      istAktiv = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function internenBenutzerLaden(
    angemeldeterAuthBenutzer:
      | User
      | null,
    istAktiv = true,
  ) {
    setLaedt(true);
    setFehler("");

    if (!angemeldeterAuthBenutzer) {
      if (istAktiv) {
        setAktuellerBenutzer(null);
        setLaedt(false);
      }

      return;
    }

    try {
      const { data, error } =
        await supabase
          .from("benutzer")
          .select(`
            id,
            benutzername,
            vorname,
            nachname,
            email,
            rolle,
            aktiv,
            annahmestelle_id,
            auth_user_id,
            annahmestellen (
              id,
              name
            )
          `)
          .eq(
            "auth_user_id",
            angemeldeterAuthBenutzer.id,
          )
          .eq("aktiv", true)
          .maybeSingle();

      if (!istAktiv) {
        return;
      }

      if (error) {
        throw new Error(
          error.message,
        );
      }

      if (!data) {
        setAktuellerBenutzer(null);
        setFehler(
          "Für dieses Login wurde kein aktiver interner Benutzer gefunden.",
        );
        return;
      }

      const geladenerBenutzer =
        benutzerUmwandeln(
          data as DatenbankBenutzer,
        );

      if (!geladenerBenutzer) {
        setAktuellerBenutzer(null);
        setFehler(
          "Die Rolle oder Auth-Verknüpfung des Benutzers ist ungültig.",
        );
        return;
      }

      setAktuellerBenutzer(
        geladenerBenutzer,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Der angemeldete Benutzer konnte nicht geladen werden:",
        unbekannterFehler,
      );

      if (!istAktiv) {
        return;
      }

      setAktuellerBenutzer(null);

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der angemeldete Benutzer konnte nicht geladen werden.",
      );
    } finally {
      if (istAktiv) {
        setLaedt(false);
      }
    }
  }

  async function benutzerNeuLaden() {
    await internenBenutzerLaden(
      authBenutzer,
    );
  }

  function benutzerAuswaehlen(
    _benutzerId: number,
  ) {
    /*
      Die freie Benutzerauswahl ist mit echter
      Supabase-Anmeldung nicht mehr erlaubt.
    */
  }

  async function abmelden() {
    setFehler("");

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setFehler(error.message);
      throw new Error(error.message);
    }

    setAuthBenutzer(null);
    setAktuellerBenutzer(null);
  }

  const benutzer = useMemo(
    () =>
      aktuellerBenutzer
        ? [aktuellerBenutzer]
        : [],
    [aktuellerBenutzer],
  );

  const contextWert = useMemo(
    (): BenutzerContextWert => ({
      aktuellerBenutzer,
      benutzer,
      laedt,
      fehler,
      istAngemeldet:
        authBenutzer !== null,
      benutzerAuswaehlen,
      benutzerNeuLaden,
      abmelden,
      hatAktuellerBenutzerBerechtigung: (
        berechtigung,
      ) =>
        aktuellerBenutzer
          ? hatBerechtigung(
              aktuellerBenutzer.rolle,
              berechtigung,
            )
          : false,
    }),
    [
      aktuellerBenutzer,
      authBenutzer,
      benutzer,
      laedt,
      fehler,
    ],
  );

  return (
    <BenutzerContext.Provider
      value={contextWert}
    >
      {children}
    </BenutzerContext.Provider>
  );
}

export function useBenutzer() {
  const context =
    useContext(BenutzerContext);

  if (!context) {
    throw new Error(
      "useBenutzer muss innerhalb des BenutzerProviders verwendet werden.",
    );
  }

  return context;
}