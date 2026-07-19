import {
  createClient,
} from "@supabase/supabase-js";
import {
  NextRequest,
  NextResponse,
} from "next/server";

type Rolle =
  | "admin"
  | "verwaltung"
  | "annahmestelle"
  | "produktion"
  | "fahrer"
  | "mitarbeiter";

type BenutzerAnlegenAnfrage = {
  benutzername?: unknown;
  vorname?: unknown;
  nachname?: unknown;
  email?: unknown;
  rolle?: unknown;
  annahmestelleId?: unknown;
};

const ERLAUBTE_ROLLEN: Rolle[] = [
  "admin",
  "verwaltung",
  "annahmestelle",
  "produktion",
  "fahrer",
  "mitarbeiter",
];

function textErmitteln(
  wert: unknown,
) {
  return typeof wert === "string"
    ? wert.trim()
    : "";
}

function rolleIstGueltig(
  wert: string,
): wert is Rolle {
  return ERLAUBTE_ROLLEN.includes(
    wert as Rolle,
  );
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
      "Nur Administratoren dürfen Benutzer anlegen.",
      403,
    );
  }

  let anfrage: BenutzerAnlegenAnfrage;

  try {
    anfrage =
      (await request.json()) as BenutzerAnlegenAnfrage;
  } catch {
    return fehlerAntwort(
      "Die übermittelten Daten sind ungültig.",
      400,
    );
  }

  const benutzername =
    textErmitteln(
      anfrage.benutzername,
    ).toLowerCase();

  const vorname =
    textErmitteln(anfrage.vorname);

  const nachname =
    textErmitteln(anfrage.nachname);

  const email =
    textErmitteln(
      anfrage.email,
    ).toLowerCase();

  const rolle =
    textErmitteln(anfrage.rolle);

  const annahmestelleId =
    typeof anfrage.annahmestelleId ===
      "number" &&
    Number.isInteger(
      anfrage.annahmestelleId,
    )
      ? anfrage.annahmestelleId
      : null;

  if (!benutzername) {
    return fehlerAntwort(
      "Bitte gib einen Benutzernamen ein.",
      400,
    );
  }

  if (
    benutzername.includes(" ")
  ) {
    return fehlerAntwort(
      "Der Benutzername darf keine Leerzeichen enthalten.",
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

  if (!rolleIstGueltig(rolle)) {
    return fehlerAntwort(
      "Die ausgewählte Rolle ist ungültig.",
      400,
    );
  }

  if (
    rolle === "annahmestelle" &&
    annahmestelleId === null
  ) {
    return fehlerAntwort(
      "Bitte ordne dem Benutzer eine Annahmestelle zu.",
      400,
    );
  }

  const {
    data: bestehenderBenutzer,
    error: bestehenderBenutzerFehler,
  } = await serverSupabase
    .from("benutzer")
    .select("id")
    .or(
      `benutzername.eq.${benutzername},email.eq.${email}`,
    )
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
      "Benutzername oder E-Mail-Adresse wird bereits verwendet.",
      409,
    );
  }

  const {
    data: einladungsDaten,
    error: einladungsFehler,
  } =
    await serverSupabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo:
          "http://localhost:3000/passwort-zuruecksetzen",
        data: {
          benutzername,
          vorname,
          nachname,
          rolle,
        },
      },
    );

  if (
    einladungsFehler ||
    !einladungsDaten.user
  ) {
    console.error(
      "Auth-Benutzer konnte nicht eingeladen werden:",
      einladungsFehler,
    );

    return fehlerAntwort(
      einladungsFehler?.message ??
        "Das Auth-Konto konnte nicht erstellt werden.",
      400,
    );
  }

  const authBenutzerId =
    einladungsDaten.user.id;

  const {
    data: neuerBenutzer,
    error: datenbankFehler,
  } = await serverSupabase
    .from("benutzer")
    .insert({
      auth_user_id: authBenutzerId,
      benutzername,
      vorname: vorname || null,
      nachname: nachname || null,
      email,
      rolle,
      aktiv: true,
      annahmestelle_id:
        rolle === "annahmestelle"
          ? annahmestelleId
          : null,
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
      erstellt_am,
      auth_user_id,
      annahmestellen (
        id,
        name
      )
    `)
    .single();

  if (
    datenbankFehler ||
    !neuerBenutzer
  ) {
    console.error(
      "Interner Benutzer konnte nicht angelegt werden:",
      datenbankFehler,
    );

    const { error: loeschFehler } =
      await serverSupabase.auth.admin.deleteUser(
        authBenutzerId,
      );

    if (loeschFehler) {
      console.error(
        "Unvollständiges Auth-Konto konnte nicht entfernt werden:",
        loeschFehler,
      );
    }

    return fehlerAntwort(
      datenbankFehler?.message ??
        "Der interne Benutzer konnte nicht angelegt werden.",
      500,
    );
  }

  return NextResponse.json(
    {
      benutzer: neuerBenutzer,
      nachricht:
        "Der Benutzer wurde angelegt und per E-Mail eingeladen.",
    },
    {
      status: 201,
    },
  );
}