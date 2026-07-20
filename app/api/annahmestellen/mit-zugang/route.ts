import {
  createClient,
} from "@supabase/supabase-js";
import {
  NextRequest,
  NextResponse,
} from "next/server";

type AnnahmestelleMitZugangAnfrage = {
  name?: unknown;
  adresse?: unknown;
  telefon?: unknown;
  ansprechpartnerVorname?: unknown;
  ansprechpartnerNachname?: unknown;
  email?: unknown;
  startpasswort?: unknown;
};

function textErmitteln(
  wert: unknown,
) {
  return typeof wert === "string"
    ? wert.trim()
    : "";
}

function fehlerAntwort(
  nachricht: string,
  status: number,
) {
  return NextResponse.json(
    {
      fehler: nachricht,
    },
    {
      status,
    },
  );
}

function startpasswortIstGueltig(
  startpasswort: string,
) {
  return (
    startpasswort.length >= 10 &&
    /[A-Z]/.test(startpasswort) &&
    /[a-z]/.test(startpasswort) &&
    /\d/.test(startpasswort)
  );
}

function benutzernameBereinigen(
  email: string,
) {
  const lokalerTeil =
    email.split("@")[0] ?? "annahmestelle";

  const bereinigt = lokalerTeil
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");

  return bereinigt || "annahmestelle";
}

export async function POST(
  request: NextRequest,
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Supabase-Servervariablen fehlen.",
    );

    return fehlerAntwort(
      "Die Serverkonfiguration ist unvollständig.",
      500,
    );
  }

  const autorisierung =
    request.headers.get("authorization");

  const zugriffstoken =
    autorisierung?.startsWith("Bearer ")
      ? autorisierung.slice(7).trim()
      : "";

  if (!zugriffstoken) {
    return fehlerAntwort(
      "Du bist nicht angemeldet.",
      401,
    );
  }

  const serverSupabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const {
    data: authDaten,
    error: authFehler,
  } = await serverSupabase.auth.getUser(
    zugriffstoken,
  );

  if (
    authFehler ||
    !authDaten.user
  ) {
    return fehlerAntwort(
      "Deine Anmeldung ist ungültig oder abgelaufen.",
      401,
    );
  }

  const {
    data: handelnderBenutzer,
    error: rollenFehler,
  } = await serverSupabase
    .from("benutzer")
    .select(`
      id,
      rolle,
      aktiv
    `)
    .eq(
      "auth_user_id",
      authDaten.user.id,
    )
    .maybeSingle();

  if (rollenFehler) {
    console.error(
      "Administratorrolle konnte nicht geprüft werden:",
      rollenFehler,
    );

    return fehlerAntwort(
      "Die Berechtigung konnte nicht geprüft werden.",
      500,
    );
  }

  if (
    !handelnderBenutzer ||
    !handelnderBenutzer.aktiv ||
    handelnderBenutzer.rolle !== "admin"
  ) {
    return fehlerAntwort(
      "Nur Administratoren dürfen Annahmestellen mit Zugang anlegen.",
      403,
    );
  }

  let anfrage: AnnahmestelleMitZugangAnfrage;

  try {
    anfrage =
      (await request.json()) as AnnahmestelleMitZugangAnfrage;
  } catch {
    return fehlerAntwort(
      "Die übermittelten Daten sind ungültig.",
      400,
    );
  }

  const name =
    textErmitteln(anfrage.name);

  const adresse =
    textErmitteln(anfrage.adresse);

  const telefon =
    textErmitteln(anfrage.telefon);

  const ansprechpartnerVorname =
    textErmitteln(
      anfrage.ansprechpartnerVorname,
    );

  const ansprechpartnerNachname =
    textErmitteln(
      anfrage.ansprechpartnerNachname,
    );

  const email =
    textErmitteln(
      anfrage.email,
    ).toLowerCase();

  const startpasswort =
    textErmitteln(
      anfrage.startpasswort,
    );

  if (!name) {
    return fehlerAntwort(
      "Bitte gib den Namen der Annahmestelle ein.",
      400,
    );
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    return fehlerAntwort(
      "Bitte gib eine gültige E-Mail-Adresse ein.",
      400,
    );
  }

  if (
    !startpasswortIstGueltig(
      startpasswort,
    )
  ) {
    return fehlerAntwort(
      "Das Startpasswort muss mindestens 10 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben sowie eine Zahl enthalten.",
      400,
    );
  }

  const {
    data: bestehendeAnnahmestelle,
    error:
      bestehendeAnnahmestelleFehler,
  } = await serverSupabase
    .from("annahmestellen")
    .select("id")
    .ilike("name", name)
    .limit(1);

  if (bestehendeAnnahmestelleFehler) {
    console.error(
      "Annahmestelle konnte nicht geprüft werden:",
      bestehendeAnnahmestelleFehler,
    );

    return fehlerAntwort(
      "Die Annahmestelle konnte nicht geprüft werden.",
      500,
    );
  }

  if (
    bestehendeAnnahmestelle &&
    bestehendeAnnahmestelle.length > 0
  ) {
    return fehlerAntwort(
      "Eine Annahmestelle mit diesem Namen ist bereits vorhanden.",
      409,
    );
  }

  const {
    data: bestehenderBenutzer,
    error: bestehenderBenutzerFehler,
  } = await serverSupabase
    .from("benutzer")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (bestehenderBenutzerFehler) {
    console.error(
      "Bestehender Benutzer konnte nicht geprüft werden:",
      bestehenderBenutzerFehler,
    );

    return fehlerAntwort(
      "Der Benutzer konnte nicht geprüft werden.",
      500,
    );
  }

  if (
    bestehenderBenutzer &&
    bestehenderBenutzer.length > 0
  ) {
    return fehlerAntwort(
      "Diese E-Mail-Adresse wird bereits verwendet.",
      409,
    );
  }

  const basisBenutzername =
    benutzernameBereinigen(email);

  let benutzername =
    basisBenutzername;

  for (
    let versuch = 1;
    versuch <= 50;
    versuch += 1
  ) {
    const {
      data: treffer,
      error: trefferFehler,
    } = await serverSupabase
      .from("benutzer")
      .select("id")
      .eq(
        "benutzername",
        benutzername,
      )
      .limit(1);

    if (trefferFehler) {
      console.error(
        "Benutzername konnte nicht geprüft werden:",
        trefferFehler,
      );

      return fehlerAntwort(
        "Der Benutzername konnte nicht geprüft werden.",
        500,
      );
    }

    if (!treffer || treffer.length === 0) {
      break;
    }

    benutzername =
      `${basisBenutzername}${versuch + 1}`;
  }

  const {
    data: neueAnnahmestelle,
    error: annahmestelleFehler,
  } = await serverSupabase
    .from("annahmestellen")
    .insert({
      name,
      adresse: adresse || null,
      telefon: telefon || null,
      aktiv: true,
    })
    .select(`
      id,
      name,
      adresse,
      telefon,
      aktiv
    `)
    .single();

  if (
    annahmestelleFehler ||
    !neueAnnahmestelle
  ) {
    console.error(
      "Annahmestelle konnte nicht angelegt werden:",
      annahmestelleFehler,
    );

    return fehlerAntwort(
      annahmestelleFehler?.message ??
        "Die Annahmestelle konnte nicht angelegt werden.",
      500,
    );
  }

  const annahmestelleId =
    Number(neueAnnahmestelle.id);

  const {
    data: authBenutzerDaten,
    error: authBenutzerFehler,
  } =
    await serverSupabase.auth.admin.createUser({
      email,
      password: startpasswort,
      email_confirm: true,
      user_metadata: {
        benutzername,
        vorname:
          ansprechpartnerVorname,
        nachname:
          ansprechpartnerNachname,
        rolle: "annahmestelle",
        annahmestelle_id:
          annahmestelleId,
      },
    });

  if (
    authBenutzerFehler ||
    !authBenutzerDaten.user
  ) {
    console.error(
      "Auth-Benutzer konnte nicht angelegt werden:",
      authBenutzerFehler,
    );

    const {
      error:
        annahmestelleLoeschFehler,
    } = await serverSupabase
      .from("annahmestellen")
      .delete()
      .eq("id", annahmestelleId);

    if (
      annahmestelleLoeschFehler
    ) {
      console.error(
        "Unvollständige Annahmestelle konnte nicht entfernt werden:",
        annahmestelleLoeschFehler,
      );
    }

    return fehlerAntwort(
      authBenutzerFehler?.message ??
        "Das Zugangskonto konnte nicht erstellt werden.",
      400,
    );
  }

  const authBenutzerId =
    authBenutzerDaten.user.id;

  const {
    data: neuerBenutzer,
    error: benutzerFehler,
  } = await serverSupabase
    .from("benutzer")
    .insert({
      auth_user_id:
        authBenutzerId,
      benutzername,
      vorname:
        ansprechpartnerVorname ||
        null,
      nachname:
        ansprechpartnerNachname ||
        null,
      email,
      rolle: "annahmestelle",
      aktiv: true,
      annahmestelle_id:
        annahmestelleId,
    })
    .select(`
      id,
      benutzername,
      vorname,
      nachname,
      email,
      rolle,
      aktiv,
      annahmestelle_id,
      erstellt_am
    `)
    .single();

  if (
    benutzerFehler ||
    !neuerBenutzer
  ) {
    console.error(
      "Interner Benutzer konnte nicht angelegt werden:",
      benutzerFehler,
    );

    const { error: authLoeschFehler } =
      await serverSupabase.auth.admin.deleteUser(
        authBenutzerId,
      );

    if (authLoeschFehler) {
      console.error(
        "Unvollständiges Auth-Konto konnte nicht entfernt werden:",
        authLoeschFehler,
      );
    }

    const {
      error:
        annahmestelleLoeschFehler,
    } = await serverSupabase
      .from("annahmestellen")
      .delete()
      .eq("id", annahmestelleId);

    if (
      annahmestelleLoeschFehler
    ) {
      console.error(
        "Unvollständige Annahmestelle konnte nicht entfernt werden:",
        annahmestelleLoeschFehler,
      );
    }

    return fehlerAntwort(
      benutzerFehler?.message ??
        "Der interne Benutzer konnte nicht angelegt werden.",
      500,
    );
  }

  return NextResponse.json(
    {
      annahmestelle:
        neueAnnahmestelle,
      benutzer: neuerBenutzer,
      zugang: {
        email,
        benutzername,
      },
      nachricht:
        "Annahmestelle und Zugang wurden erfolgreich angelegt.",
    },
    {
      status: 201,
    },
  );
}