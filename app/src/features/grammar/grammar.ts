/**
 * Static grammar content for the teaching half of the app. Deliberately not in
 * Supabase: the topics are authored, not user data, so they ship with the build
 * and the pages stay readable with no network at all.
 *
 * Latin-American Spanish throughout — no `vosotros` anywhere in the tables.
 */

export type Example = {
  es: string;
  en: string;
  /** Optional aside: why this example is here, or the trap it shows. */
  note?: string;
};

export type Section =
  | { kind: "note"; title?: string; body: string }
  | { kind: "examples"; title?: string; items: Example[] }
  | { kind: "table"; title?: string; columns: string[]; rows: string[][] };

export type Topic = {
  slug: string;
  title: string;
  /** Grouping label shown on the card. */
  tag: "se" | "verbs" | "pronouns" | "adjectives" | "basics";
  /**
   * Which band of the grid the topic sits in. Ordering only — nothing is
   * locked, so a level 3 card is one tap away on day one. "spoken" is a track
   * beside the three, not above them: reactions and fillers are useful from
   * the first week and still useful at the end.
   */
  level: 1 | 2 | 3 | "spoken";
  /** One line on the grid card. */
  blurb: string;
  /** Bento width: 1 = half, 2 = full row. */
  span: 1 | 2;
  sections: Section[];
};

const PERSONS = [
  "yo",
  "tú",
  "él / ella / usted",
  "nosotros",
  "ellos / ustedes",
];

/** Build a conjugation table from one column per verb. */
function conjugation(
  title: string,
  verbs: { infinitive: string; forms: string[] }[],
): Section {
  return {
    kind: "table",
    title,
    columns: ["", ...verbs.map((verb) => verb.infinitive)],
    rows: PERSONS.map((person, index) => [
      person,
      ...verbs.map((verb) => verb.forms[index]),
    ]),
  };
}

export const TOPICS: Topic[] = [
  {
    slug: "presente-regular",
    title: "Present tense: -ar, -er, -ir",
    tag: "verbs",
    level: 1,
    blurb: "The three regular endings, and why -er and -ir are almost twins.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Drop the infinitive ending and add the endings below. -er and -ir differ in exactly one form: nosotros (comemos vs vivimos).",
      },
      conjugation("Regular present", [
        {
          infinitive: "hablar",
          forms: ["hablo", "hablas", "habla", "hablamos", "hablan"],
        },
        {
          infinitive: "comer",
          forms: ["como", "comes", "come", "comemos", "comen"],
        },
        {
          infinitive: "vivir",
          forms: ["vivo", "vives", "vive", "vivimos", "viven"],
        },
      ]),
      {
        kind: "examples",
        title: "In use",
        items: [
          {
            es: "Hablo español todos los días.",
            en: "I speak Spanish every day.",
          },
          { es: "¿Comes carne?", en: "Do you eat meat?" },
          {
            es: "Vivimos cerca del parque.",
            en: "We live near the park.",
            note: "Spanish drops the subject pronoun unless you need contrast.",
          },
        ],
      },
      conjugation("The four you'll need first (irregular)", [
        { infinitive: "ser", forms: ["soy", "eres", "es", "somos", "son"] },
        {
          infinitive: "estar",
          forms: ["estoy", "estás", "está", "estamos", "están"],
        },
        { infinitive: "ir", forms: ["voy", "vas", "va", "vamos", "van"] },
        {
          infinitive: "tener",
          forms: ["tengo", "tienes", "tiene", "tenemos", "tienen"],
        },
      ]),
    ],
  },
  {
    slug: "genero",
    title: "Gender and plurals",
    tag: "basics",
    level: 1,
    blurb: "el or la, and what actually predicts it.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Every noun has a gender and the article carries it, so learn the article with the word: not mesa but la mesa. Adjectives and demonstratives then follow the noun, which is why getting this wrong ripples through the sentence.",
      },
      {
        kind: "table",
        title: "Endings that predict it",
        columns: ["ending", "gender", "example"],
        rows: [
          ["-o", "masculine", "el libro (but: la mano, la foto)"],
          ["-a", "feminine", "la casa (but: el día, el mapa)"],
          ["-ción / -sión", "feminine", "la canción, la decisión"],
          ["-dad / -tad / -tud", "feminine", "la ciudad, la libertad"],
          ["-ma (from Greek)", "masculine", "el problema, el tema, el clima"],
          ["-or", "masculine", "el color (but: la flor)"],
          ["-ista", "either", "el artista / la artista"],
          ["-e", "either — memorize", "el coche, la noche"],
        ],
      },
      {
        kind: "note",
        title: "el agua is still feminine",
        body: "A feminine noun starting with a stressed a- takes el for sound only: el agua, el águila, el hambre, el aula. The noun stays feminine everywhere else — el agua fría, las aguas.",
      },
      {
        kind: "table",
        title: "Making it plural",
        columns: ["word ends in", "add", "example"],
        rows: [
          ["vowel", "-s", "casa → casas"],
          ["consonant", "-es", "papel → papeles"],
          ["-z", "-ces", "lápiz → lápices"],
          ["accented -ón, -és", "-es, accent drops", "canción → canciones"],
          ["unstressed -s", "nothing changes", "el lunes → los lunes"],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "El problema es la mano.",
            en: "The problem is the hand.",
            note: "Both exceptions in one sentence.",
          },
          {
            es: "Las ciudades grandes son caras.",
            en: "Big cities are expensive.",
            note: "Gender and number ripple out to every adjective.",
          },
          {
            es: "El agua está fría.",
            en: "The water is cold.",
            note: "el for sound, fría because agua is feminine.",
          },
          {
            es: "Un lápiz, dos lápices.",
            en: "One pencil, two pencils.",
          },
        ],
      },
    ],
  },
  {
    slug: "ser-estar",
    title: "ser vs estar",
    tag: "basics",
    level: 1,
    blurb: "What something is, versus how it currently is.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "ser: identity, origin, profession, time, what a thing fundamentally is. estar: location, state, mood, the result of a change.",
      },
      {
        kind: "examples",
        items: [
          { es: "Soy de Noruega.", en: "I'm from Norway." },
          { es: "Estoy en el hotel.", en: "I'm at the hotel." },
          {
            es: "La sopa es rica. / La sopa está fría.",
            en: "The soup is delicious. / The soup is cold.",
            note: "Same adjective slot, different claim: a trait vs a state.",
          },
          {
            es: "Es aburrido. / Está aburrido.",
            en: "He's boring. / He's bored.",
            note: "The classic trap.",
          },
        ],
      },
    ],
  },
  {
    slug: "preposiciones",
    title: "Prepositions that carry the load",
    tag: "basics",
    level: 1,
    blurb: "a, de, en, con — plus the por/para split.",
    span: 1,
    sections: [
      {
        kind: "table",
        title: "Core four",
        columns: ["prep", "does", "example"],
        rows: [
          ["a", "direction, personal a", "Voy a la playa. / Veo a María."],
          [
            "de",
            "origin, possession, material",
            "Soy de Oslo. / la casa de Ana",
          ],
          ["en", "in / on / at a place", "Estoy en la tienda."],
          ["con", "with", "Café con leche."],
        ],
      },
      {
        kind: "note",
        title: "por vs para",
        body: "para points forward: purpose, destination, deadline, recipient. por points back or through: cause, exchange, duration, route.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Este regalo es para ti.",
            en: "This gift is for you.",
            note: "recipient → para",
          },
          {
            es: "Gracias por la ayuda.",
            en: "Thanks for the help.",
            note: "cause → por",
          },
          {
            es: "Pagué veinte dólares por el taxi.",
            en: "I paid twenty dollars for the taxi.",
            note: "exchange → por",
          },
          {
            es: "Salgo para el aeropuerto.",
            en: "I'm leaving for the airport.",
            note: "destination → para",
          },
        ],
      },
    ],
  },
  {
    slug: "adjetivos",
    title: "Adjectives: agreement & place",
    tag: "adjectives",
    level: 1,
    blurb:
      "They match the noun, usually follow it, and move to change meaning.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "Agreement",
        columns: ["", "masculine", "feminine"],
        rows: [
          ["singular", "un plato rico", "una sopa rica"],
          ["plural", "unos platos ricos", "unas sopas ricas"],
          [
            "-e / -ista / consonant",
            "un café grande, un chico fácil",
            "una casa grande, una tarea fácil",
          ],
        ],
      },
      {
        kind: "note",
        title: "Position",
        body: "Default: after the noun (“un coche rojo”). Before the noun it becomes subjective or emphatic — and a few adjectives flip meaning entirely.",
      },
      {
        kind: "table",
        title: "Movers",
        columns: ["before the noun", "after the noun"],
        rows: [
          [
            "un viejo amigo — a long-standing friend",
            "un amigo viejo — an elderly friend",
          ],
          ["un gran hombre — a great man", "un hombre grande — a big man"],
          [
            "el pobre chico — the poor thing",
            "el chico pobre — the boy without money",
          ],
          [
            "diferentes opciones — various options",
            "opciones diferentes — options that differ",
          ],
        ],
      },
      {
        kind: "table",
        title: "Comparing",
        columns: ["pattern", "example"],
        rows: [
          ["más … que", "Es más caro que el otro."],
          ["menos … que", "Hoy hay menos gente que ayer."],
          ["tan … como", "Es tan rico como el de casa."],
          ["el/la más … de", "Es el mejor restaurante de la ciudad."],
          ["-ísimo", "buenísimo, carísimo, riquísima"],
        ],
      },
      {
        kind: "note",
        title: "Irregular pairs",
        body: "bueno → mejor, malo → peor, grande → mayor (older), pequeño → menor (younger). Say “mejor que”, never “más bueno que”.",
      },
    ],
  },
  {
    slug: "este-esta-esto",
    title: "este, esta, esto",
    tag: "adjectives",
    level: 1,
    blurb:
      "This one, that one, and the neuter form for the thing you can't name.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Three distances, not two: este = here by me, ese = there by you, aquel = over there, away from both. este and ese agree with a noun; esto, eso and aquello are neuter — they have no gender, no plural, and never touch a noun.",
      },
      {
        kind: "table",
        title: "The full set",
        columns: [
          "distance",
          "masc.",
          "fem.",
          "masc. pl.",
          "fem. pl.",
          "neuter",
        ],
        rows: [
          ["here (by me)", "este", "esta", "estos", "estas", "esto"],
          ["there (by you)", "ese", "esa", "esos", "esas", "eso"],
          ["over there", "aquel", "aquella", "aquellos", "aquellas", "aquello"],
        ],
      },
      {
        kind: "note",
        title: "When to reach for the neuter",
        body: "esto / eso / aquello point at something unnamed: an idea, a situation, a whole sentence, or an object you can't identify yet. The moment the noun is named, you switch to the gendered form — “¿Qué es esto?” but “Este libro es mío.”",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Este café está frío.",
            en: "This coffee is cold.",
            note: "café is masculine → este.",
          },
          {
            es: "Esta cuenta, por favor.",
            en: "This bill, please.",
            note: "cuenta is feminine → esta.",
          },
          {
            es: "¿Qué es esto?",
            en: "What is this?",
            note: "No noun yet, so neuter. Never “¿Qué es este?”",
          },
          {
            es: "Eso no es verdad.",
            en: "That's not true.",
            note: "Refers to what was just said — an idea, not a thing.",
          },
          {
            es: "Quiero ese, no este.",
            en: "I want that one, not this one.",
            note: "Standing alone for a known noun: still gendered.",
          },
          {
            es: "Esto es todo. / Eso es.",
            en: "That's everything. / That's it, exactly.",
            note: "Two everyday fixed phrases.",
          },
          {
            es: "Aquel día no lo olvido.",
            en: "I'll never forget that day.",
            note: "aquel also does distance in time, not just space.",
          },
        ],
      },
      {
        kind: "note",
        title: "The accent is gone",
        body: "Old textbooks write éste / ése when the word stands alone. The RAE dropped that accent in 2010 — write este and ese in both roles. Only the neuter esto / eso / aquello never carried one anyway.",
      },
    ],
  },
  {
    slug: "opuestos",
    title: "Opposites",
    tag: "adjectives",
    level: 1,
    blurb: "duro/blando, ligero/pesado — pairs learned two at a time.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Cheapest vocabulary in the language: learn the pair, not the word. All of these are adjectives, so they agree with the noun — “la caja es pesada”, “los platos están sucios”.",
      },
      {
        kind: "table",
        title: "Size, weight, shape",
        columns: ["", "", "meaning"],
        rows: [
          ["grande", "pequeño / chico", "big / small"],
          ["alto", "bajo", "tall, high / short, low"],
          ["largo", "corto", "long / short (length)"],
          ["ancho", "estrecho / angosto", "wide / narrow"],
          ["grueso / gordo", "delgado / flaco", "thick, fat / thin"],
          ["pesado", "ligero / liviano", "heavy / light"],
          ["lleno", "vacío", "full / empty"],
          ["profundo", "poco profundo", "deep / shallow"],
        ],
      },
      {
        kind: "table",
        title: "Touch, temperature, condition",
        columns: ["", "", "meaning"],
        rows: [
          ["duro", "blando", "hard / soft (yielding)"],
          ["áspero", "suave", "rough / smooth, gentle"],
          ["caliente", "frío", "hot / cold"],
          ["mojado / húmedo", "seco", "wet, damp / dry"],
          ["limpio", "sucio", "clean / dirty"],
          ["nuevo", "viejo / usado", "new / old, used"],
          ["fuerte", "débil", "strong / weak"],
          ["claro", "oscuro", "light, pale / dark"],
          ["ruidoso", "silencioso / callado", "noisy / quiet"],
        ],
      },
      {
        kind: "table",
        title: "Judgement and pace",
        columns: ["", "", "meaning"],
        rows: [
          ["fácil", "difícil", "easy / hard (to do)"],
          ["barato", "caro", "cheap / expensive"],
          ["rápido", "lento", "fast / slow"],
          ["bueno", "malo", "good / bad"],
          ["mejor", "peor", "better / worse"],
          ["bonito / lindo", "feo", "pretty / ugly"],
          ["joven", "mayor", "young / older"],
          ["temprano", "tarde", "early / late"],
          ["mismo", "distinto / diferente", "same / different"],
          ["cierto / verdadero", "falso", "true / false"],
        ],
      },
      {
        kind: "table",
        title: "Not adjectives, same trick",
        columns: ["", "", "meaning"],
        rows: [
          ["cerca", "lejos", "near / far"],
          ["dentro", "fuera", "inside / outside"],
          ["antes", "después", "before / after"],
          ["siempre", "nunca", "always / never"],
          ["mucho", "poco", "a lot / a little"],
          ["todo", "nada", "everything / nothing"],
          ["alguien", "nadie", "someone / no one"],
          ["subir", "bajar", "to go up / to go down"],
          ["encender / prender", "apagar", "to turn on / to turn off"],
          ["abrir", "cerrar", "to open / to close"],
        ],
      },
      {
        kind: "note",
        title: "Two words for “hard”, two for “light”",
        body: "duro is hard to the touch, difícil is hard to do — never swap them. ligero is light in weight, claro is light in colour, and la luz is the light on the ceiling. Same split for “soft”: blando gives way under pressure, suave is smooth or gentle.",
      },
      {
        kind: "examples",
        title: "In use",
        items: [
          {
            es: "El colchón es muy duro. Quiero uno más blando.",
            en: "The mattress is very hard. I want a softer one.",
            note: "más + adjective is the whole comparative.",
          },
          {
            es: "Esta maleta está pesada, la otra es más ligera.",
            en: "This suitcase is heavy, the other one is lighter.",
          },
          {
            es: "El examen fue fácil, no difícil.",
            en: "The exam was easy, not hard.",
          },
          {
            es: "El vaso está lleno; el mío, vacío.",
            en: "The glass is full; mine, empty.",
            note: "Condition → estar, not ser.",
          },
          {
            es: "Prefiero el azul claro, no el oscuro.",
            en: "I prefer the light blue, not the dark one.",
          },
          {
            es: "¿Está limpio o sucio?",
            en: "Is it clean or dirty?",
          },
        ],
      },
      {
        kind: "note",
        title: "Negating instead",
        body: "When you don't know the opposite, “no muy” or “poco” gets you there: no muy caro, poco común, nada fácil. And in- / des- flips many words outright: útil → inútil, posible → imposible, ordenado → desordenado.",
      },
    ],
  },
  {
    slug: "preguntas",
    title: "Asking questions",
    tag: "basics",
    level: 1,
    blurb: "The question words, and why ¿cuál es tu nombre? beats ¿qué?",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The words",
        columns: ["word", "asks", "example"],
        rows: [
          ["qué", "what (definition, kind)", "¿Qué es esto?"],
          ["cuál / cuáles", "which (choice from a set)", "¿Cuál prefieres?"],
          ["quién / quiénes", "who", "¿Quién llamó?"],
          ["cómo", "how, what … like", "¿Cómo está el clima?"],
          ["cuándo", "when", "¿Cuándo llegas?"],
          ["dónde / adónde", "where / where to", "¿Adónde vamos?"],
          ["de dónde", "where from", "¿De dónde eres?"],
          ["por qué / para qué", "why / what for", "¿Para qué sirve?"],
          ["cuánto / cuánta", "how much", "¿Cuánto cuesta?"],
          ["cuántos / cuántas", "how many", "¿Cuántas personas?"],
        ],
      },
      {
        kind: "note",
        title: "qué vs cuál",
        body: "qué asks what something is; cuál asks which one out of several. Before ser, Spanish almost always wants cuál: ¿Cuál es tu nombre? ¿Cuál es el problema? “¿Qué es tu nombre?” is the classic English-shaped mistake. Before a noun, use qué: ¿Qué color prefieres?",
      },
      {
        kind: "note",
        title: "No do, and the preposition goes first",
        body: "There is no helper verb: the subject just moves behind the verb — ¿Dónde vive tu hermano? For yes/no questions nothing changes at all except your intonation: ¿Vienes? And a preposition never gets stranded at the end: ¿Con quién vas?, ¿De qué hablan?, never “¿Quién vas con?”.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "¿Cuál es tu número?",
            en: "What's your number?",
            note: "Choice out of all possible numbers → cuál.",
          },
          {
            es: "¿Qué haces?",
            en: "What are you doing?",
          },
          {
            es: "¿Cómo se dice “fork” en español?",
            en: "How do you say “fork” in Spanish?",
            note: "The most useful sentence in this whole app.",
          },
          {
            es: "No sé dónde está.",
            en: "I don't know where it is.",
            note: "Indirect question — the accent stays.",
          },
        ],
      },
    ],
  },
  {
    slug: "haber-tener-estar",
    title: "hay, tener, estar",
    tag: "verbs",
    level: 1,
    blurb: "There is, I have, it's over there — three verbs English blurs.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "Which one",
        columns: ["verb", "does", "example"],
        rows: [
          ["hay", "there is / there are", "Hay un banco aquí."],
          ["tener", "to have, to hold", "Tengo dos hermanos."],
          ["estar", "location, state", "El banco está aquí."],
          ["ser", "identity, what it is", "Es un banco."],
        ],
      },
      {
        kind: "note",
        title: "hay vs está",
        body: "hay introduces something new and indefinite; está locates something you both already know about. “¿Hay un baño?” asks whether one exists at all. “¿Dónde está el baño?” asks where the known one is. hay never changes for number: hay un taxi, hay diez taxis. Past: había — also invariable, so “habían muchos” is a common native slip, not a model.",
      },
      {
        kind: "table",
        title: "tener where English uses “to be”",
        columns: ["", "means"],
        rows: [
          ["tener hambre / sed", "to be hungry / thirsty"],
          ["tener frío / calor", "to be cold / hot"],
          ["tener sueño", "to be sleepy"],
          ["tener miedo", "to be afraid"],
          ["tener prisa", "to be in a hurry"],
          ["tener razón", "to be right"],
          ["tener ganas de", "to feel like"],
          ["tener cuidado", "to be careful"],
          ["tener … años", "to be … years old"],
          ["tener suerte", "to be lucky"],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "Tengo treinta años.",
            en: "I'm thirty.",
            note: "Never “soy treinta años”.",
          },
          {
            es: "¿Hay wifi? — Sí, la contraseña está en la mesa.",
            en: "Is there wifi? — Yes, the password is on the table.",
            note: "hay for existence, está for the known thing.",
          },
          {
            es: "Hay que reservar.",
            en: "You have to book.",
            note: "Impersonal obligation — nobody in particular.",
          },
          {
            es: "Tengo frío. / Hace frío.",
            en: "I'm cold. / It's cold out.",
            note: "Person → tener, weather → hacer.",
          },
        ],
      },
    ],
  },
  {
    slug: "ubicacion",
    title: "Where things are",
    tag: "basics",
    level: 1,
    blurb:
      "delante de, al lado de, encima de — the location phrases, and the de that stays.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Almost every location phrase is two words ending in de, and it pairs with estar, not ser: “El banco está al lado del hotel.” The de contracts with el — de + el = del — and never with la, los, las.",
      },
      {
        kind: "table",
        title: "The phrases",
        columns: ["phrase", "means", "example"],
        rows: [
          [
            "delante de",
            "in front of (physically ahead)",
            "El taxi está delante de la casa.",
          ],
          [
            "enfrente de / frente a",
            "opposite, facing",
            "La farmacia está enfrente del parque.",
          ],
          ["detrás de", "behind", "El baño está detrás de la barra."],
          ["al lado de / junto a", "next to", "Siéntate al lado de mí."],
          ["cerca de", "near", "Vivo cerca del centro."],
          ["lejos de", "far from", "Está lejos de aquí."],
          [
            "encima de / sobre",
            "on top of",
            "Las llaves están encima de la mesa.",
          ],
          ["debajo de / bajo", "under", "El gato está debajo del sofá."],
          ["dentro de / adentro", "inside", "Espérame dentro del edificio."],
          ["fuera de / afuera", "outside", "Fuma fuera de la casa."],
          [
            "entre",
            "between, among",
            "El café está entre el banco y la plaza.",
          ],
          ["alrededor de", "around", "Caminamos alrededor de la plaza."],
          ["en medio de", "in the middle of", "Se paró en medio de la calle."],
          ["a la derecha de", "to the right of", "A la derecha de la puerta."],
          [
            "a la izquierda de",
            "to the left of",
            "A la izquierda de la ventana.",
          ],
          ["al final de", "at the end of", "Al final del pasillo."],
          ["al fondo (de)", "at the back of", "El baño está al fondo."],
          ["arriba de / abajo de", "above / below", "El piso de arriba."],
        ],
      },
      {
        kind: "note",
        title: "Drop the de when there is no second thing",
        body: "With a landmark you keep de; without one the same word stands alone as an adverb: “Está delante de la tienda” vs “Está delante.” Same for detrás, cerca, encima, debajo, al lado, enfrente. Never “delante la tienda”.",
      },
      {
        kind: "examples",
        title: "The traps",
        items: [
          {
            es: "Enfrente del hotel hay un café.",
            en: "There's a café opposite the hotel.",
            note: "de + el = del, always.",
          },
          {
            es: "Está delante de mí, no delante de yo.",
            en: "It's in front of me.",
            note: "After a preposition: mí, ti, él — never yo or tú.",
          },
          {
            es: "El perro está debajo de la mesa.",
            en: "The dog is under the table.",
            note: "Location = estar. “Es debajo” is wrong.",
          },
          {
            es: "Vamos al lado del río.",
            en: "Let's go next to the river.",
            note: "a + el = al, the other contraction.",
          },
          {
            es: "¿Está cerca? — Sí, aquí nomás.",
            en: "Is it close? — Yeah, right here.",
            note: "No landmark, so cerca stands bare.",
          },
        ],
      },
    ],
  },
  {
    slug: "numeros",
    title: "Numbers, dates, prices",
    tag: "basics",
    level: 1,
    blurb: "Counting, telling the time, and asking what it costs.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The ones worth memorizing",
        columns: ["", "", ""],
        rows: [
          ["16–19", "dieciséis … diecinueve", "one word"],
          ["21–29", "veintiuno … veintinueve", "one word"],
          ["31+", "treinta y uno", "three words, with y"],
          ["100", "cien / ciento", "cien pesos, but ciento veinte"],
          [
            "200 / 500",
            "doscientos / quinientos",
            "500, 700, 900 are irregular",
          ],
          ["700 / 900", "setecientos / novecientos", "not sietecientos"],
          ["1 000", "mil", "never “un mil”"],
          ["1 000 000", "un millón (de)", "un millón de pesos"],
        ],
      },
      {
        kind: "note",
        title: "uno agrees, and shortens",
        body: "uno becomes un before a masculine noun and una before a feminine one: veintiún pesos, veintiuna sillas. cien is exactly 100; anything above it is ciento: ciento cincuenta.",
      },
      {
        kind: "table",
        title: "Dates and time",
        columns: ["", "", "note"],
        rows: [
          ["el 5 de mayo", "the 5th of May", "days and months stay lowercase"],
          ["el lunes", "on Monday", "no en"],
          ["los lunes", "on Mondays", "plural = every week"],
          ["Son las tres.", "It's three o'clock.", "but: Es la una."],
          ["las tres y media", "half past three", "y cuarto, y media"],
          ["diez para las tres", "ten to three", "LatAm; Spain: menos diez"],
          ["a las ocho", "at eight", "de la mañana / tarde / noche"],
        ],
      },
      {
        kind: "examples",
        title: "Paying for something",
        items: [
          { es: "¿Cuánto cuesta?", en: "How much does it cost?" },
          {
            es: "¿Cuánto es?",
            en: "How much is it (all together)?",
            note: "At the till, for the whole bill.",
          },
          {
            es: "Son ciento veinte pesos.",
            en: "That's a hundred and twenty pesos.",
          },
          {
            es: "¿Me da un descuento?",
            en: "Can you give me a discount?",
            note: "Polite, and it works at a market.",
          },
          { es: "¿Puedo pagar con tarjeta?", en: "Can I pay by card?" },
        ],
      },
    ],
  },
  {
    slug: "clima-cuerpo",
    title: "Weather and how you feel",
    tag: "basics",
    level: 1,
    blurb: "hace frío vs tengo frío, and me duele la cabeza.",
    span: 1,
    sections: [
      {
        kind: "table",
        title: "Weather runs on hacer and estar",
        columns: ["", "means"],
        rows: [
          ["hace frío / calor", "it's cold / hot"],
          ["hace sol / viento", "it's sunny / windy"],
          ["hace buen tiempo", "the weather's nice"],
          ["está nublado", "it's cloudy"],
          ["está lloviendo / llueve", "it's raining"],
          ["hay niebla", "it's foggy"],
        ],
      },
      {
        kind: "note",
        title: "Weather vs you",
        body: "The weather uses hacer; a person uses tener. Hace frío is “it's cold out”; Tengo frío is “I'm cold”. Estoy frío would mean your body is cold to the touch.",
      },
      {
        kind: "note",
        title: "doler works backwards",
        body: "Like gustar: the body part is the subject. Me duele la cabeza, me duelen los pies. And it takes the article, not a possessive — never “me duele mi cabeza”.",
      },
      {
        kind: "examples",
        items: [
          { es: "Me duele la garganta.", en: "My throat hurts." },
          { es: "Estoy resfriado.", en: "I have a cold." },
          { es: "Me siento mal. / No me siento bien.", en: "I feel sick." },
          { es: "Tengo fiebre.", en: "I have a fever." },
        ],
      },
    ],
  },
  {
    slug: "acentos",
    title: "Accents and spelling",
    tag: "basics",
    level: 1,
    blurb: "The tilde has three jobs — and sí is not si.",
    span: 1,
    sections: [
      {
        kind: "note",
        title: "Job one: mark the odd stress",
        body: "A word ending in a vowel, -n or -s is stressed on the second-to-last syllable (casa, hablan). Anything else is stressed on the last (hablar, feliz). The tilde marks every word that breaks the rule: café, canción, lápiz, música.",
      },
      {
        kind: "table",
        title: "Job two: split identical twins",
        columns: ["with", "without"],
        rows: [
          ["sí — yes", "si — if"],
          ["él — he", "el — the"],
          ["tú — you", "tu — your"],
          ["mí — me", "mi — my"],
          ["sé — I know", "se — the se card"],
          ["más — more", "mas — but (literary)"],
          ["té — tea", "te — you (object)"],
          ["dé — give", "de — of"],
        ],
      },
      {
        kind: "note",
        title: "Job three: mark a question",
        body: "Question words carry a tilde even inside a statement: No sé dónde está. Me preguntó qué quería. Without it, que and como are just connectors.",
      },
      {
        kind: "note",
        title: "Letters that change the word",
        body: "ñ, ll and rr are not decoration: año is a year and ano is not, pero is but and perro is a dog, caro is expensive and carro is a car. Worth the extra beat when you say them.",
      },
    ],
  },
  {
    slug: "pasado",
    title: "Past: preterite vs imperfect",
    tag: "verbs",
    level: 2,
    blurb: "One finished event, or the background it happened against.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Preterite = a completed event with edges (“I ate at eight”). Imperfect = what used to happen, or the scenery around an event (“I was eating when…”).",
      },
      conjugation("Preterite (pretérito)", [
        {
          infinitive: "hablar",
          forms: ["hablé", "hablaste", "habló", "hablamos", "hablaron"],
        },
        {
          infinitive: "comer",
          forms: ["comí", "comiste", "comió", "comimos", "comieron"],
        },
        {
          infinitive: "vivir",
          forms: ["viví", "viviste", "vivió", "vivimos", "vivieron"],
        },
      ]),
      conjugation("Imperfect (imperfecto)", [
        {
          infinitive: "hablar",
          forms: ["hablaba", "hablabas", "hablaba", "hablábamos", "hablaban"],
        },
        {
          infinitive: "comer",
          forms: ["comía", "comías", "comía", "comíamos", "comían"],
        },
        {
          infinitive: "vivir",
          forms: ["vivía", "vivías", "vivía", "vivíamos", "vivían"],
        },
      ]),
      {
        kind: "examples",
        title: "The contrast",
        items: [
          {
            es: "Ayer comí en un restaurante nuevo.",
            en: "Yesterday I ate at a new restaurant.",
            note: "One finished event → preterite.",
          },
          {
            es: "Cuando era niño, comía ahí cada domingo.",
            en: "When I was a kid, I used to eat there every Sunday.",
            note: "Habit / background → imperfect.",
          },
          {
            es: "Comía tranquilo cuando sonó el teléfono.",
            en: "I was eating quietly when the phone rang.",
            note: "Imperfect sets the scene, preterite interrupts it.",
          },
        ],
      },
    ],
  },
  {
    slug: "fue-estaba-estuve",
    title: "fue vs estaba vs estuve",
    tag: "verbs",
    level: 2,
    blurb: "Three pasts of “was” — the trait, the scenery, the stretch.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "fue = ser in the preterite: what something was, judged as a whole. estaba = estar in the imperfect: an ongoing state, the background. estuve = estar in the preterite: a state with a beginning and an end you can point at.",
      },
      {
        kind: "table",
        title: "Same sentence, three readings",
        columns: ["form", "reads as", "example"],
        rows: [
          ["fue", "the event, summed up", "La fiesta fue increíble."],
          ["estuvo", "how it turned out", "La fiesta estuvo increíble."],
          [
            "estaba",
            "how it was while it lasted",
            "La fiesta estaba tranquila cuando llegué.",
          ],
        ],
      },
      {
        kind: "examples",
        title: "Picking one",
        items: [
          {
            es: "Estaba nervioso antes de la entrevista.",
            en: "I was nervous before the interview.",
            note: "Background state, no edges → imperfect.",
          },
          {
            es: "Estuve enfermo tres días.",
            en: "I was sick for three days.",
            note: "A measured stretch → preterite of estar.",
          },
          {
            es: "Mi abuelo fue profesor.",
            en: "My grandfather was a teacher.",
            note: "A whole life's identity, closed → fue.",
          },
          {
            es: "Mi abuelo era muy serio.",
            en: "My grandfather was very serious.",
            note: "A trait with no edges → era.",
          },
          {
            es: "Fue al mercado.",
            en: "He/she went to the market.",
            note: "Trap: fui/fue belong to both ser and ir. Context decides.",
          },
        ],
      },
      {
        kind: "note",
        title: "Latin-American habit",
        body: "For food, events and weather, estuvo is everywhere: “estuvo rico”, “estuvo buenísimo”, “ayer estuvo frío”. Using fue there sounds stiff.",
      },
    ],
  },
  {
    slug: "preterito-cambia",
    title: "Verbs that change meaning in the past",
    tag: "verbs",
    level: 2,
    blurb: "sabía is knew; supe is found out.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "A handful of verbs mean one thing stretched out in the imperfect and another thing as a single moment in the preterite. The imperfect keeps the plain meaning; the preterite turns it into an event.",
      },
      {
        kind: "table",
        columns: ["verb", "imperfect", "preterite"],
        rows: [
          ["saber", "sabía — knew", "supe — found out"],
          ["conocer", "conocía — knew, was familiar with", "conocí — met"],
          ["querer", "quería — wanted", "quise — tried to"],
          ["no querer", "no quería — didn't want", "no quise — refused"],
          ["poder", "podía — could, was able", "pude — managed to"],
          ["no poder", "no podía — couldn't", "no pude — failed to"],
          ["tener", "tenía — had", "tuve — got, received"],
          ["haber", "había — there was", "hubo — there occurred"],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "Lo supe ayer.",
            en: "I found out yesterday.",
            note: "Not “I knew yesterday”.",
          },
          {
            es: "Quise llamarte, pero no había señal.",
            en: "I tried to call you, but there was no signal.",
          },
          {
            es: "No quiso venir.",
            en: "He refused to come.",
            note: "Much stronger than no quería venir.",
          },
          {
            es: "Tuve una idea.",
            en: "I got an idea.",
            note: "The moment it arrived.",
          },
          {
            es: "Hubo un accidente.",
            en: "There was an accident.",
            note: "An event; había un accidente would be scenery.",
          },
        ],
      },
    ],
  },
  {
    slug: "futuro",
    title: "Future: ir a + the -é endings",
    tag: "verbs",
    level: 2,
    blurb: "The one everyone actually says, and the one in writing.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "Day to day, “ir a + infinitive” carries almost all future talk. The simple future adds endings straight onto the whole infinitive — same endings for -ar, -er and -ir.",
      },
      conjugation("ir a + infinitive", [
        {
          infinitive: "hablar",
          forms: [
            "voy a hablar",
            "vas a hablar",
            "va a hablar",
            "vamos a hablar",
            "van a hablar",
          ],
        },
      ]),
      conjugation("Simple future", [
        {
          infinitive: "hablar",
          forms: ["hablaré", "hablarás", "hablará", "hablaremos", "hablarán"],
        },
        {
          infinitive: "comer",
          forms: ["comeré", "comerás", "comerá", "comeremos", "comerán"],
        },
      ]),
      {
        kind: "examples",
        items: [
          {
            es: "Mañana voy a llamar al doctor.",
            en: "Tomorrow I'm going to call the doctor.",
          },
          {
            es: "El pedido llegará el viernes.",
            en: "The order will arrive on Friday.",
            note: "Simple future reads more formal / written.",
          },
        ],
      },
    ],
  },
  {
    slug: "verbos-reflexivos",
    title: "Daily reflexive verbs",
    tag: "verbs",
    level: 2,
    blurb: "The routine ones: levantarse, ducharse, acostarse.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "Conjugate the verb normally and put the matching pronoun in front. With an infinitive you can attach it instead: “me voy a duchar” = “voy a ducharme”.",
      },
      conjugation("levantarse", [
        {
          infinitive: "levantarse",
          forms: [
            "me levanto",
            "te levantas",
            "se levanta",
            "nos levantamos",
            "se levantan",
          ],
        },
      ]),
      {
        kind: "examples",
        title: "A morning",
        items: [
          {
            es: "Me despierto a las seis y me levanto a las seis y media.",
            en: "I wake up at six and get up at six thirty.",
          },
          {
            es: "Me ducho y me visto rápido.",
            en: "I shower and get dressed quickly.",
          },
          {
            es: "Nos acostamos temprano entre semana.",
            en: "We go to bed early on weekdays.",
          },
        ],
      },
    ],
  },
  {
    slug: "perfectos",
    title: "he comido, había comido",
    tag: "verbs",
    level: 2,
    blurb: "The have-done tenses — and when Latin America skips them.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "haber + participle. The participle never changes shape here: he comido, ha comido, hemos comido — only haber conjugates.",
      },
      {
        kind: "table",
        title: "haber",
        columns: ["", "present — have done", "imperfect — had done"],
        rows: [
          ["yo", "he", "había"],
          ["tú", "has", "habías"],
          ["él / ella / usted", "ha", "había"],
          ["nosotros", "hemos", "habíamos"],
          ["ellos / ustedes", "han", "habían"],
        ],
      },
      {
        kind: "table",
        title: "Participles that break the pattern",
        columns: ["verb", "participle"],
        rows: [
          ["hacer", "hecho"],
          ["decir", "dicho"],
          ["ver", "visto"],
          ["poner", "puesto"],
          ["escribir", "escrito"],
          ["volver", "vuelto"],
          ["abrir", "abierto"],
          ["morir", "muerto"],
          ["romper", "roto"],
        ],
      },
      {
        kind: "note",
        title: "Latin America often just uses the preterite",
        body: "Where Spain says “¿Has comido?”, most of Latin America says “¿Ya comiste?”. The present perfect still exists and is understood everywhere, but for something finished today the plain preterite sounds more natural.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Nunca he probado el mezcal.",
            en: "I've never tried mezcal.",
            note: "Life experience — the perfect is at home here.",
          },
          {
            es: "Ya había salido cuando llamaste.",
            en: "He'd already left when you called.",
            note: "Past before another past → había.",
          },
          {
            es: "¿Ya comiste? — Sí, ya comí.",
            en: "Have you eaten? — Yes, I have.",
            note: "The everyday LatAm version.",
          },
        ],
      },
    ],
  },
  {
    slug: "gustar",
    title: "gustar and the backwards verbs",
    tag: "verbs",
    level: 2,
    blurb: "The thing is the subject. You are the object.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Me gusta el café does not mean “I like coffee” word for word — it means “coffee pleases me”. The thing is the subject, you are the indirect object, and the verb agrees with the thing, not with you. Get this one structure and a dozen everyday verbs come free.",
      },
      {
        kind: "table",
        title: "The shape",
        columns: ["", "one thing", "several things"],
        rows: [
          ["me", "me gusta el café", "me gustan los libros"],
          ["te", "te gusta", "te gustan"],
          ["le", "le gusta (él, ella, usted)", "le gustan"],
          ["nos", "nos gusta", "nos gustan"],
          ["les", "les gusta (ellos, ustedes)", "les gustan"],
        ],
      },
      {
        kind: "table",
        title: "Same shape, other verbs",
        columns: ["verb", "means", "example"],
        rows: [
          ["encantar", "to love", "Me encanta este lugar."],
          ["interesar", "to interest", "Me interesa el arte."],
          ["importar", "to matter", "No me importa."],
          ["molestar", "to bother", "¿Te molesta el ruido?"],
          ["doler", "to hurt", "Me duele la espalda."],
          ["faltar", "to be missing", "Me falta un plato."],
          ["quedar", "to have left; to suit", "Me quedan dos días."],
          ["parecer", "to seem", "Me parece bien."],
          ["costar", "to be hard", "Me cuesta entender."],
          ["hacer falta", "to be needed", "Me hace falta café."],
        ],
      },
      {
        kind: "note",
        title: "The a mí part",
        body: "Add a mí, a ti, a él, a María in front for emphasis or to clear up who le means: A ella le gusta, a mí no. The me / te / le never disappears — “a mí gusta” is wrong.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Me gusta leer y escribir.",
            en: "I like reading and writing.",
            note: "Infinitives count as one thing → gusta, singular.",
          },
          {
            es: "Me gustan mucho los tacos.",
            en: "I really like tacos.",
            note: "Plural thing → gustan.",
          },
          {
            es: "Me gustas.",
            en: "I like you.",
            note: "The person is the subject here — it means attraction. Careful.",
          },
          {
            es: "¿Te parece si vamos a las ocho?",
            en: "Does eight work for you?",
          },
        ],
      },
    ],
  },
  {
    slug: "saber-conocer",
    title: "saber vs conocer",
    tag: "verbs",
    level: 2,
    blurb: "Knowing a fact vs being acquainted with a thing.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "saber is information: facts, times, how to do something. conocer is familiarity: people, places, books, music — things you have met or been to.",
      },
      {
        kind: "table",
        columns: ["", "use", "example"],
        rows: [
          ["saber", "a fact", "Sé que llega mañana."],
          ["saber", "how to do something", "Sé nadar."],
          ["saber", "information", "No sé la hora."],
          ["conocer", "a person", "Conozco a María."],
          ["conocer", "a place", "Conozco Bogotá."],
          ["conocer", "a work, a style", "¿Conoces esa canción?"],
        ],
      },
      {
        kind: "note",
        title: "In the preterite they shift",
        body: "supe = I found out. conocí = I met (for the first time). The imperfect keeps the plain meaning: sabía = I knew, conocía = I was familiar with.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "No sé, pregúntale a él.",
            en: "I don't know, ask him.",
          },
          {
            es: "¿Sabes dónde está la estación?",
            en: "Do you know where the station is?",
          },
          {
            es: "La conocí en Lima.",
            en: "I met her in Lima.",
            note: "conocer + personal a for people.",
          },
        ],
      },
    ],
  },
  {
    slug: "pedir-preguntar",
    title: "pedir vs preguntar",
    tag: "verbs",
    level: 2,
    blurb: "Asking for a thing vs asking a question.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "Both are “to ask”. pedir requests a thing or an action. preguntar asks for information. You pide a coffee and pregunta what time it is.",
      },
      {
        kind: "table",
        columns: ["", "example"],
        rows: [
          ["pedir algo", "Pedí un café."],
          ["pedir ayuda / permiso", "Te pido un favor."],
          ["pedir prestado", "¿Me prestas tu cargador?"],
          ["preguntar algo", "Le pregunté la hora."],
          ["preguntar por alguien", "Preguntó por ti."],
          ["hacer una pregunta", "¿Puedo hacerte una pregunta?"],
        ],
      },
      {
        kind: "note",
        title: "preguntar por has two jobs",
        body: "It means to ask after someone (Preguntó por ti — he asked about you) and to ask where to find something (Pregunta por la salida).",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Voy a pedir la cuenta.",
            en: "I'll ask for the bill.",
            note: "A thing → pedir.",
          },
          {
            es: "Le voy a preguntar si está abierto.",
            en: "I'll ask him whether it's open.",
            note: "Information → preguntar.",
          },
        ],
      },
    ],
  },
  {
    slug: "imperativo",
    title: "Commands",
    tag: "verbs",
    level: 2,
    blurb: "dime, no me digas — and where the pronoun goes.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The forms",
        columns: ["", "hablar", "comer", "escribir"],
        rows: [
          ["tú", "habla", "come", "escribe"],
          ["tú, negative", "no hables", "no comas", "no escribas"],
          ["usted", "hable", "coma", "escriba"],
          ["ustedes", "hablen", "coman", "escriban"],
        ],
      },
      {
        kind: "note",
        body: "Affirmative tú is just the él form of the present — habla, come, escribe. Everything else (negative tú, usted, ustedes) borrows the present subjunctive, which is why the vowel flips.",
      },
      {
        kind: "table",
        title: "The eight irregular tú commands",
        columns: ["verb", "command", "example"],
        rows: [
          ["venir", "ven", "Ven acá."],
          ["decir", "di", "Dime."],
          ["salir", "sal", "Sal de ahí."],
          ["hacer", "haz", "Hazlo ahora."],
          ["tener", "ten", "Ten cuidado."],
          ["ir", "ve", "Ve al banco."],
          ["poner", "pon", "Pon la mesa."],
          ["ser", "sé", "Sé amable."],
        ],
      },
      {
        kind: "note",
        title: "Pronouns flip sides",
        body: "Affirmative: the pronoun sticks to the end and often adds an accent — dímelo, siéntate, tráelo. Negative: it goes in front — no me lo digas, no te sientes.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Dime una cosa.",
            en: "Tell me something.",
          },
          {
            es: "No te preocupes.",
            en: "Don't worry.",
            note: "Negative → pronoun in front.",
          },
          {
            es: "¿Me pasas la sal, porfa?",
            en: "Can you pass me the salt, please?",
            note: "A question is the softest command there is.",
          },
          {
            es: "Siéntese, por favor.",
            en: "Have a seat, please.",
            note: "usted form for a stranger.",
          },
        ],
      },
    ],
  },
  {
    slug: "pronombres",
    title: "Object pronouns & where they go",
    tag: "pronouns",
    level: 2,
    blurb: "me / te / lo / la / le — and the two legal positions.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The sets",
        columns: ["person", "subject", "direct", "indirect", "reflexive"],
        rows: [
          ["1sg", "yo", "me", "me", "me"],
          ["2sg", "tú", "te", "te", "te"],
          ["3sg", "él / ella / usted", "lo / la", "le", "se"],
          ["1pl", "nosotros", "nos", "nos", "nos"],
          ["3pl", "ellos / ustedes", "los / las", "les", "se"],
        ],
      },
      {
        kind: "note",
        title: "Position",
        body: "Before a conjugated verb, or attached to an infinitive / gerund / affirmative command. Indirect comes before direct: “me lo”, never “lo me”.",
      },
      {
        kind: "examples",
        items: [
          { es: "¿El menú? Lo tengo aquí.", en: "The menu? I have it here." },
          {
            es: "Voy a mandártelo. / Te lo voy a mandar.",
            en: "I'm going to send it to you.",
            note: "Both are correct — attach both pronouns, or move both up front.",
          },
          { es: "Dímelo otra vez.", en: "Tell it to me again." },
        ],
      },
    ],
  },
  {
    slug: "que",
    title: "Living on “que”",
    tag: "basics",
    level: 2,
    blurb: "tengo que, hay que, quiero que, lo que — one word, many jobs.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The obligation trio",
        columns: ["pattern", "means", "example"],
        rows: [
          [
            "tener que + infinitive",
            "personal obligation",
            "Tengo que trabajar.",
          ],
          [
            "hay que + infinitive",
            "general rule, nobody named",
            "Hay que reservar antes.",
          ],
          ["deber + infinitive", "should, softer duty", "Debes descansar."],
        ],
      },
      {
        kind: "note",
        title: "que + a second subject",
        body: "After verbs of wanting, asking, hoping and feeling, “que” introduces a new subject — and that verb goes subjunctive: quiero que, espero que, necesito que, me gusta que, dile que.",
      },
      {
        kind: "examples",
        items: [
          { es: "Quiero que me acompañes.", en: "I want you to come with me." },
          {
            es: "Creo que está abierto.",
            en: "I think it's open.",
            note: "Reporting a fact → indicative, no subjunctive.",
          },
          {
            es: "Es que no tengo tiempo.",
            en: "The thing is, I don't have time.",
            note: "“es que” = the excuse opener. Extremely common.",
          },
          {
            es: "El taxi que pedí no llegó.",
            en: "The taxi I ordered didn't arrive.",
            note: "Relative que — English drops “that”, Spanish never does.",
          },
          {
            es: "Lo que necesito es dormir.",
            en: "What I need is to sleep.",
            note: "“lo que” = what / the thing that.",
          },
          {
            es: "Tengo más hambre que sueño.",
            en: "I'm hungrier than I am sleepy.",
            note: "Comparison: más/menos … que.",
          },
          {
            es: "¡Que te vaya bien!",
            en: "Hope it goes well for you!",
            note: "A bare que + subjunctive is a wish.",
          },
        ],
      },
    ],
  },
  {
    slug: "comparativos",
    title: "Comparisons",
    tag: "adjectives",
    level: 2,
    blurb: "más que, tan como, and the four irregulars.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The frames",
        columns: ["frame", "means", "example"],
        rows: [
          ["más … que", "more … than", "Es más caro que el otro."],
          ["menos … que", "less … than", "Hoy hay menos gente que ayer."],
          ["tan … como", "as … as", "Es tan alto como yo."],
          ["tanto/a … como", "as much … as", "No tengo tanto tiempo como tú."],
          ["tantos/as … como", "as many … as", "Tengo tantos libros como él."],
          ["tanto como", "as much as", "Trabaja tanto como ella."],
          [
            "el / la más … de",
            "the most … in",
            "Es el más barato de la ciudad.",
          ],
        ],
      },
      {
        kind: "table",
        title: "The irregulars",
        columns: ["", "instead of", "means"],
        rows: [
          ["mejor", "más bueno", "better"],
          ["peor", "más malo", "worse"],
          ["mayor", "más grande (age)", "older, bigger"],
          ["menor", "más pequeño (age)", "younger, smaller"],
        ],
      },
      {
        kind: "note",
        title: "de, not que, before a number",
        body: "Más de veinte personas. Menos de diez minutos. que before a number turns it into a different sentence: no tengo más que diez pesos means “I only have ten”.",
      },
      {
        kind: "note",
        title: "-ísimo is the shortcut",
        body: "Drop the final vowel and add -ísimo: caro → carísimo, bueno → buenísimo, fácil → facilísimo. It means very, and it sounds far more natural than piling on muy.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Este café es mejor que el otro.",
            en: "This coffee is better than the other one.",
          },
          {
            es: "Mi hermana mayor vive en Chile.",
            en: "My older sister lives in Chile.",
          },
          { es: "Está buenísimo.", en: "It's really good." },
          {
            es: "Cuesta más de lo que pensaba.",
            en: "It costs more than I thought.",
            note: "más de lo que before a clause.",
          },
        ],
      },
    ],
  },
  {
    slug: "tiempo-expresiones",
    title: "How long, how recently",
    tag: "basics",
    level: 2,
    blurb: "hace dos años que…, llevo tres meses…, acabo de…",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "The frames",
        columns: ["frame", "means", "example"],
        rows: [
          [
            "hace + time + que + present",
            "has been … for",
            "Hace dos años que vivo aquí.",
          ],
          [
            "present + desde hace",
            "same thing, flipped",
            "Vivo aquí desde hace dos años.",
          ],
          [
            "llevo + time + -ando",
            "I've been …-ing for",
            "Llevo tres meses estudiando.",
          ],
          ["hace + time + preterite", "… ago", "Llegué hace dos días."],
          ["desde + a date", "since", "Trabajo aquí desde marzo."],
          ["acabar de + infinitive", "to have just", "Acabo de llegar."],
          ["estar a punto de", "to be about to", "Está a punto de salir."],
          ["soler + infinitive", "to usually", "Suelo caminar por la mañana."],
        ],
      },
      {
        kind: "note",
        title: "The one that trips people",
        body: "hace + time + present means it's still happening: Hace un año que trabajo aquí — I've worked here for a year and still do. hace + time with a preterite means ago and it's over: Trabajé ahí hace un año.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "¿Cuánto tiempo llevas aquí?",
            en: "How long have you been here?",
            note: "The natural way to ask it.",
          },
          { es: "Acabo de comer, gracias.", en: "I've just eaten, thanks." },
          {
            es: "Hace mucho que no nos vemos.",
            en: "It's been ages since we saw each other.",
          },
        ],
      },
    ],
  },
  {
    slug: "preposiciones-mas",
    title: "More prepositions",
    tag: "basics",
    level: 2,
    blurb: "desde, hasta, entre, sobre, hacia, sin — and verbs that own one.",
    span: 1,
    sections: [
      {
        kind: "table",
        title: "The next tier",
        columns: ["prep", "does", "example"],
        rows: [
          [
            "desde",
            "starting point in time or space",
            "Trabajo aquí desde marzo.",
          ],
          ["hasta", "end point, up to", "Abierto hasta las diez."],
          ["entre", "between, among", "Entre tú y yo."],
          [
            "sobre",
            "on top of; about",
            "El libro sobre la mesa. / Un libro sobre México.",
          ],
          ["bajo / debajo de", "under", "Debajo de la cama."],
          [
            "hacia",
            "toward (direction, no arrival)",
            "Caminé hacia el centro.",
          ],
          ["sin", "without", "Un café sin azúcar."],
          ["contra", "against", "Nada contra la corriente."],
          ["durante", "during, for a span", "Llovió durante la noche."],
          ["según", "according to", "Según el mapa, falta poco."],
        ],
      },
      {
        kind: "note",
        title: "Two-word ones",
        body: "Most location and time phrases end in de: antes de, después de, cerca de, lejos de, dentro de, fuera de, encima de, al lado de, a través de. The de never disappears: “cerca del hotel”.",
      },
      {
        kind: "table",
        title: "Verbs that come with a preposition",
        columns: ["verb + prep", "example"],
        rows: [
          ["pensar en", "Pienso en mudarme."],
          ["soñar con", "Soñé con el mar."],
          ["depender de", "Depende del clima."],
          ["acordarse de", "No me acuerdo de su nombre."],
          ["tratar de", "Trato de practicar cada día."],
          ["insistir en", "Insistió en pagar."],
          ["empezar a", "Empecé a estudiar español."],
          ["ayudar a", "¿Me ayudas a cargar esto?"],
        ],
      },
      {
        kind: "note",
        title: "After a preposition, use the infinitive",
        body: "Where English uses -ing, Spanish uses the plain infinitive: “antes de salir”, “después de comer”, “sin pensar”, “para aprender”.",
      },
    ],
  },
  {
    slug: "porque",
    title: "porque, por qué, porqué",
    tag: "basics",
    level: 2,
    blurb: "Four spellings, one sound.",
    span: 1,
    sections: [
      {
        kind: "table",
        columns: ["", "is", "example"],
        rows: [
          ["por qué", "why (question)", "¿Por qué no viniste?"],
          ["porque", "because", "Porque estaba cansado."],
          ["el porqué", "the reason (a noun)", "No entiendo el porqué."],
          ["por que", "for which (rare)", "La razón por que lo hizo."],
        ],
      },
      {
        kind: "note",
        body: "The accent marks a question, and it survives inside a statement too: No sé por qué. Two words plus accent asks; one word without answers.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "— ¿Por qué? — Porque sí.",
            en: "— Why? — Just because.",
            note: "Porque sí is the everyday non-answer.",
          },
          { es: "No me dijo por qué.", en: "He didn't tell me why." },
          {
            es: "Es por eso que no fui.",
            en: "That's why I didn't go.",
            note: "por eso links a cause you already gave.",
          },
        ],
      },
    ],
  },
  {
    slug: "conectores",
    title: "Joining sentences",
    tag: "basics",
    level: 2,
    blurb: "aunque, sin embargo, así que — and pero vs sino.",
    span: 1,
    sections: [
      {
        kind: "table",
        columns: ["", "means"],
        rows: [
          ["pero", "but"],
          ["sino", "but rather (after a negative)"],
          ["aunque", "although, even if"],
          ["sin embargo", "however"],
          ["en cambio", "on the other hand"],
          ["así que", "so (result)"],
          ["por lo tanto", "therefore"],
          ["ya que / como", "since, given that"],
          ["mientras", "while"],
          ["además", "besides, also"],
          ["de hecho", "in fact"],
          ["al final / por fin", "in the end / at last"],
        ],
      },
      {
        kind: "note",
        title: "pero vs sino",
        body: "sino only appears after a negative, and it corrects it: No es azul sino verde. If a conjugated verb follows, it becomes sino que: No lo perdí, sino que lo regalé.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Aunque llueva, vamos.",
            en: "Even if it rains, we're going.",
            note: "aunque + subjunctive when it's hypothetical.",
          },
          {
            es: "Está lejos, así que tomemos un taxi.",
            en: "It's far, so let's take a taxi.",
          },
          {
            es: "No fui, ya que estaba enfermo.",
            en: "I didn't go, since I was ill.",
          },
        ],
      },
    ],
  },
  {
    slug: "ya",
    title: "ya, ya no, todavía",
    tag: "basics",
    level: 2,
    blurb:
      "The word that marks a change of state — already, no longer, right now.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "ya says something has flipped: it wasn't, now it is (or the reverse). Its four everyday uses are already, no longer, right now, and a plain intensifier.",
      },
      {
        kind: "table",
        title: "The pairs to learn together",
        columns: ["form", "means", "example"],
        rows: [
          ["ya", "already", "Ya comí."],
          ["todavía no / aún no", "not yet", "Todavía no como."],
          ["ya no", "not anymore", "Ya no fumo."],
          ["todavía / aún", "still", "Todavía vivo aquí."],
        ],
      },
      {
        kind: "examples",
        title: "Spoken uses",
        items: [
          { es: "¡Ya voy!", en: "I'm coming! (right now)" },
          {
            es: "Ya está.",
            en: "That's it. / Done.",
            note: "Closes a task, hands something over.",
          },
          { es: "¿Ya llegaste?", en: "Are you there yet?" },
          {
            es: "Ya que estás aquí, ayúdame.",
            en: "Since you're here, help me.",
            note: "ya que = since / given that.",
          },
          {
            es: "Ya veremos.",
            en: "We'll see.",
            note: "Politely postpones a decision.",
          },
          { es: "Ya no me acuerdo.", en: "I don't remember anymore." },
        ],
      },
    ],
  },
  {
    slug: "falsos-amigos",
    title: "False friends",
    tag: "basics",
    level: 2,
    blurb: "The words that look English and aren't.",
    span: 2,
    sections: [
      {
        kind: "table",
        title: "It looks like…",
        columns: ["word", "actually means", "the English word is"],
        rows: [
          ["embarazada", "pregnant", "avergonzado (embarrassed)"],
          ["constipado", "congested, blocked up", "estreñido (constipated)"],
          ["éxito", "success", "salida (exit)"],
          ["actualmente", "currently", "en realidad (actually)"],
          ["sensible", "sensitive", "sensato (sensible)"],
          ["realizar", "to carry out", "darse cuenta (to realize)"],
          ["asistir", "to attend", "ayudar (to assist)"],
          ["pretender", "to intend", "fingir (to pretend)"],
          ["soportar", "to put up with", "apoyar (to support)"],
          ["introducir", "to insert", "presentar (to introduce)"],
          ["carpeta", "folder", "alfombra (carpet)"],
          ["librería", "bookshop", "biblioteca (library)"],
          ["sopa", "soup", "jabón (soap)"],
          ["ropa", "clothes", "cuerda (rope)"],
          ["largo", "long", "grande (large)"],
          ["once", "eleven", "una vez (once)"],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "Estoy avergonzado, no embarazada.",
            en: "I'm embarrassed, not pregnant.",
            note: "The most famous one, and it does happen.",
          },
          {
            es: "El evento fue un éxito.",
            en: "The event was a success.",
          },
          {
            es: "Actualmente vivo en Oslo.",
            en: "I currently live in Oslo.",
            note: "Not “actually”.",
          },
        ],
      },
    ],
  },
  {
    slug: "subjuntivo",
    title: "Present subjunctive",
    tag: "verbs",
    level: 3,
    blurb: "For what you want, doubt, or feel — not what you report.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Take the yo form of the present, drop the -o, and add the *other* conjugation's endings: -ar verbs take e-endings, -er/-ir verbs take a-endings. Because it starts from yo, irregular yo forms carry over: tengo → tenga, hago → haga, conozco → conozca.",
      },
      conjugation("Regular present subjunctive", [
        {
          infinitive: "hablar",
          forms: ["hable", "hables", "hable", "hablemos", "hablen"],
        },
        {
          infinitive: "comer",
          forms: ["coma", "comas", "coma", "comamos", "coman"],
        },
        {
          infinitive: "vivir",
          forms: ["viva", "vivas", "viva", "vivamos", "vivan"],
        },
      ]),
      conjugation("The irregulars worth memorizing", [
        { infinitive: "ser", forms: ["sea", "seas", "sea", "seamos", "sean"] },
        {
          infinitive: "estar",
          forms: ["esté", "estés", "esté", "estemos", "estén"],
        },
        {
          infinitive: "ir",
          forms: ["vaya", "vayas", "vaya", "vayamos", "vayan"],
        },
        {
          infinitive: "saber",
          forms: ["sepa", "sepas", "sepa", "sepamos", "sepan"],
        },
        {
          infinitive: "haber",
          forms: ["haya", "hayas", "haya", "hayamos", "hayan"],
        },
      ]),
      {
        kind: "table",
        title: "What triggers it",
        columns: ["trigger", "example"],
        rows: [
          ["wanting / asking", "Quiero que vengas."],
          ["emotion", "Me alegra que estés aquí."],
          ["doubt / denial", "No creo que sea buena idea."],
          ["impersonal judgement", "Es importante que descanses."],
          ["ojalá", "Ojalá llueva."],
          ["future “when”", "Cuando llegues, avísame."],
        ],
      },
      {
        kind: "note",
        title: "The dividing line",
        body: "Two different subjects + a trigger → subjunctive. Same subject → plain infinitive: “Quiero ir” (I want to go) vs “Quiero que vayas” (I want you to go). And reporting facts stays indicative: “Creo que es buena idea”, but “No creo que sea buena idea”.",
      },
      {
        kind: "examples",
        title: "Everyday lines",
        items: [
          { es: "Espero que te guste.", en: "I hope you like it." },
          { es: "Dile que me llame.", en: "Tell him to call me." },
          {
            es: "Busco un hotel que tenga piscina.",
            en: "I'm looking for a hotel that has a pool.",
            note: "Hypothetical hotel → subjunctive. A specific one you know: “que tiene piscina”.",
          },
          {
            es: "Aunque cueste más, lo quiero.",
            en: "Even if it costs more, I want it.",
          },
        ],
      },
    ],
  },
  {
    slug: "si-tuviera",
    title: "si tuviera, iría",
    tag: "verbs",
    level: 3,
    blurb:
      "The past subjunctive and the conditional, the pair that does “would”.",
    span: 2,
    sections: [
      {
        kind: "note",
        title: "Building the past subjunctive",
        body: "One rule, no exceptions: take the ellos form of the preterite, drop -ron, add -ra. hablaron → hablara. tuvieron → tuviera. fueron → fuera. Every irregular verb you already learned in the preterite comes along for free.",
      },
      {
        kind: "table",
        title: "The forms",
        columns: ["", "tener", "ser / ir", "poder", "hacer"],
        rows: [
          ["yo", "tuviera", "fuera", "pudiera", "hiciera"],
          ["tú", "tuvieras", "fueras", "pudieras", "hicieras"],
          ["él / ella / usted", "tuviera", "fuera", "pudiera", "hiciera"],
          ["nosotros", "tuviéramos", "fuéramos", "pudiéramos", "hiciéramos"],
          ["ellos / ustedes", "tuvieran", "fueran", "pudieran", "hicieran"],
        ],
      },
      {
        kind: "table",
        title: "The conditional — infinitive + ía",
        columns: ["verb", "form", "note"],
        rows: [
          ["hablar", "hablaría", "regular: whole infinitive + ía"],
          ["tener", "tendría", "same irregular stems as the future"],
          ["hacer", "haría", ""],
          ["poder", "podría", ""],
          ["decir", "diría", ""],
          ["salir", "saldría", ""],
          ["venir", "vendría", ""],
          ["saber", "sabría", ""],
          ["poner", "pondría", ""],
        ],
      },
      {
        kind: "note",
        title: "The pattern",
        body: "si + past subjunctive, then conditional: Si tuviera tiempo, iría. The si half never takes the conditional — “si tendría” is the mistake to avoid. Same shape for something contrary to fact right now: Si fuera tú, no lo haría.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Si pudiera, me quedaría una semana más.",
            en: "If I could, I'd stay another week.",
          },
          {
            es: "Ojalá tuviera más tiempo.",
            en: "I wish I had more time.",
            note: "ojalá + past subjunctive = wishing for the unlikely.",
          },
          {
            es: "Quisiera un café, por favor.",
            en: "I'd like a coffee, please.",
            note: "The politest way to order anything.",
          },
          {
            es: "¿Podrías ayudarme?",
            en: "Could you help me?",
          },
          {
            es: "Como si nada.",
            en: "Like nothing happened.",
            note: "como si always takes this tense.",
          },
        ],
      },
    ],
  },
  {
    slug: "se-reflexivo",
    title: "se — reflexive & reciprocal",
    tag: "se",
    level: 3,
    blurb: "The action lands back on the person doing it.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "The pronoun matches the subject: me, te, se, nos, se. Many verbs change meaning with it — ir (to go) vs irse (to leave).",
      },
      {
        kind: "examples",
        items: [
          { es: "Me levanto a las seis.", en: "I get (myself) up at six." },
          { es: "¿Cómo se llama usted?", en: "What is your name?" },
          {
            es: "Se abrazaron en el aeropuerto.",
            en: "They hugged each other at the airport.",
            note: "Same pronoun, reciprocal meaning: each other.",
          },
          {
            es: "Ya me voy.",
            en: "I'm leaving now.",
            note: "irse ≠ ir: the pronoun changes the verb's meaning.",
          },
        ],
      },
    ],
  },
  {
    slug: "se-impersonal",
    title: "se — impersonal & passive",
    tag: "se",
    level: 3,
    blurb: "No one in particular does it. Signs and rules live here.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "“se + verb” hides the doer. If a thing is named, the verb agrees with that thing (se vende casa / se venden casas).",
      },
      {
        kind: "examples",
        items: [
          { es: "Aquí se habla español.", en: "Spanish is spoken here." },
          {
            es: "Se venden casas.",
            en: "Houses for sale.",
            note: "Plural thing → plural verb.",
          },
          {
            es: "¿Cómo se dice “straw” en español?",
            en: "How do you say “straw” in Spanish?",
          },
          { es: "No se puede fumar adentro.", en: "You can't smoke inside." },
        ],
      },
    ],
  },
  {
    slug: "se-accidental",
    title: "se — the “it happened to me” se",
    tag: "se",
    level: 3,
    blurb: "se me cayó: the accident owns you, not the other way round.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "Pattern: se + me/te/le/nos/les + verb agreeing with the thing. It frames the event as unplanned — no blame attached to the person.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Se me cayó el vaso.",
            en: "I dropped the glass. (it fell on me)",
            note: "Compare “tiré el vaso” — I threw it, deliberately.",
          },
          {
            es: "Se me olvidaron las llaves.",
            en: "I forgot the keys.",
            note: "Plural keys → olvidaron.",
          },
          { es: "Se nos hizo tarde.", en: "We ran late." },
          { es: "Se le acabó la batería.", en: "His/her battery died." },
        ],
      },
    ],
  },
  {
    slug: "se-lo-di",
    title: "se — the one that replaces le",
    tag: "se",
    level: 3,
    blurb: "le + lo is illegal, so le becomes se.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "When an indirect object (le / les) meets a direct object (lo, la, los, las), the first turns into se. Nothing reflexive about it — it's pure sound.",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Se lo di.",
            en: "I gave it to him/her/them.",
            note: "Not “le lo di”.",
          },
          {
            es: "¿La cuenta? Ya se la pedí al mesero.",
            en: "The bill? I already asked the waiter for it.",
          },
        ],
      },
    ],
  },
  {
    slug: "lo",
    title: "lo — the neuter one",
    tag: "pronouns",
    level: 3,
    blurb: "lo bueno, lo que dijiste, lo de ayer.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "This lo is not the object pronoun. It turns an adjective or a whole clause into a thing — the abstract, unnamed “part” or “bit” English needs extra words for.",
      },
      {
        kind: "table",
        columns: ["frame", "means", "example"],
        rows: [
          ["lo + adjective", "the … part", "lo bueno, lo difícil"],
          ["lo que", "what, the thing that", "Eso es lo que quiero."],
          ["lo de", "the business of", "lo de ayer"],
          ["lo mío / lo tuyo", "my thing, your thing", "Cocinar no es lo mío."],
          ["lo más … posible", "as … as possible", "lo antes posible"],
          ["lo + adj + que", "how … it is", "No sabes lo difícil que es."],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "Lo bueno es que no llovió.",
            en: "The good thing is it didn't rain.",
          },
          {
            es: "No entendí lo que dijo.",
            en: "I didn't understand what he said.",
          },
          {
            es: "Llámame lo antes posible.",
            en: "Call me as soon as possible.",
          },
        ],
      },
    ],
  },
  {
    slug: "participios",
    title: "está cerrado vs fue cerrado",
    tag: "verbs",
    level: 3,
    blurb: "The participle as a state, an action, or an adjective.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "estar + participle describes the state something ended up in. ser + participle is the passive: it reports the action itself, and it sounds formal — spoken Spanish usually reaches for se instead.",
      },
      {
        kind: "table",
        columns: ["", "means"],
        rows: [
          ["La tienda está cerrada.", "The shop is closed (state)."],
          [
            "La tienda fue cerrada.",
            "The shop was closed (someone closed it).",
          ],
          ["Se cerró la tienda.", "The shop closed — the everyday version."],
        ],
      },
      {
        kind: "note",
        title: "It agrees like an adjective",
        body: "Once the participle sits after ser or estar it behaves like any adjective: las puertas están abiertas, la carta está escrita.",
      },
      {
        kind: "examples",
        items: [
          { es: "Ya está hecho.", en: "It's done already." },
          {
            es: "Estoy cansado. / Estamos perdidos.",
            en: "I'm tired. / We're lost.",
          },
          {
            es: "Se habla español.",
            en: "Spanish spoken here.",
            note: "The impersonal se does the work of a passive.",
          },
        ],
      },
    ],
  },
  {
    slug: "reacciones",
    title: "Reacting to what someone says",
    tag: "basics",
    level: "spoken",
    blurb: "Ways out of sí, muy bien and qué guay on repeat.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Listening out loud is half of a conversation in Spanish — people expect a noise back every few seconds. Three or four stock reactions on repeat is what marks a learner, so the fix is range, not new grammar. (And qué guay is Spain: in Latin America it lands as foreign.)",
      },
      {
        kind: "table",
        title: "Swap the overused one",
        columns: ["instead of", "try", "when"],
        rows: [
          ["sí", "claro / exacto / así es", "you agree with a claim"],
          ["sí", "ajá / ya / mmm", "you're just still listening"],
          ["muy bien", "qué bueno / buenísimo", "good news for them"],
          ["muy bien", "dale / va / listo", "agreeing to a plan"],
          ["qué guay", "qué chévere / qué padre", "LatAm equivalents"],
          ["no sé", "ni idea / quién sabe", "you really don't know"],
          ["qué malo", "qué lástima / qué pena", "bad news for them"],
        ],
      },
      {
        kind: "table",
        title: "Agreeing, from mild to total",
        columns: ["", "means"],
        rows: [
          ["claro", "of course, sure"],
          ["exacto / exactamente", "exactly"],
          ["así es", "that's right"],
          ["eso mismo", "that's just it"],
          ["tal cual", "precisely, just like that"],
          ["obvio", "obviously (casual)"],
          ["totalmente", "totally"],
          ["te entiendo", "I get you"],
          ["tienes razón", "you're right"],
          ["estoy de acuerdo", "I agree (a shade more formal)"],
        ],
      },
      {
        kind: "table",
        title: "Good news",
        columns: ["", "means", "where"],
        rows: [
          ["¡qué bueno!", "that's great", "everywhere"],
          ["¡buenísimo! / ¡genial!", "brilliant", "everywhere"],
          ["¡qué bien!", "nice, glad to hear", "everywhere"],
          ["¡qué chévere!", "how cool", "Colombia, Venezuela, C. America"],
          ["¡qué padre! / ¡qué chido!", "how cool", "Mexico"],
          ["¡qué bacán!", "how cool", "Chile, Peru"],
          ["¡qué lindo! / ¡qué bonito!", "how lovely", "everywhere"],
          ["¡me alegro!", "I'm happy for you", "everywhere"],
          ["¡felicidades!", "congrats", "everywhere"],
        ],
      },
      {
        kind: "table",
        title: "Bad news",
        columns: ["", "means"],
        rows: [
          ["qué lástima / qué pena", "what a shame"],
          ["qué mal", "that's rough"],
          ["ay, no", "oh no"],
          ["lo siento (mucho)", "I'm (so) sorry"],
          ["pobrecito / pobrecita", "poor thing"],
          ["qué horror / qué feo", "how awful"],
          ["no me lo puedo creer", "I can't believe it"],
          ["ánimo", "hang in there"],
          ["ojalá se arregle", "hope it works out"],
        ],
      },
      {
        kind: "table",
        title: "Surprise and doubt",
        columns: ["", "means", "where"],
        rows: [
          ["¿en serio? / ¿de verdad?", "really?", "everywhere"],
          ["no me digas", "you don't say", "everywhere"],
          ["¡no puede ser!", "no way!", "everywhere"],
          ["¿cómo así?", "how come?", "Colombia"],
          ["¿neta? / no manches", "for real? / no way", "Mexico"],
          ["órale", "wow / alright then", "Mexico"],
          ["¡qué fuerte!", "that's intense", "everywhere"],
          ["me sorprende", "that surprises me", "everywhere"],
          ["¿estás seguro?", "are you sure?", "everywhere"],
        ],
      },
      {
        kind: "table",
        title: "Keep them talking",
        columns: ["", "does"],
        rows: [
          ["ajá / mmm / ya", "the noise that means go on"],
          ["¿y luego? / ¿y qué pasó?", "and then?"],
          ["cuéntame", "tell me about it"],
          ["¿cómo fue?", "what was it like?"],
          ["¿y tú qué hiciste?", "and what did you do?"],
          ["¿sí? / ¿ah sí?", "oh yeah?"],
          ["a ver", "let's see / go on then"],
          ["espera, ¿qué?", "wait, what?"],
        ],
      },
      {
        kind: "note",
        title: "The ¡qué …! formula",
        body: "qué + adjective or bare noun makes an exclamation, and the article disappears: ¡Qué frío! ¡Qué suerte! ¡Qué día! To add an adjective to the noun, slip in tan or más: ¡Qué día tan largo! ¡Qué idea más buena! Never “¡Qué un día!”.",
      },
      {
        kind: "examples",
        title: "In a real exchange",
        items: [
          {
            es: "— Me ascendieron. — ¡Qué bueno! ¡Felicidades! ¿Y cuándo empiezas?",
            en: "— I got promoted. — That's great! Congrats! And when do you start?",
            note: "React, then hand the turn back with a question.",
          },
          {
            es: "— Perdí el vuelo. — Ay, no, qué mal. ¿Y ahora qué haces?",
            en: "— I missed my flight. — Oh no, that's rough. So what now?",
          },
          {
            es: "— Llevo diez años aquí. — ¿En serio? No me lo imaginaba.",
            en: "— I've been here ten years. — Really? I'd never have guessed.",
          },
          {
            es: "— Nos vemos a las ocho. — Dale, ahí nos vemos.",
            en: "— See you at eight. — Sure, see you there.",
            note: "dale for plans; va and listo do the same job.",
          },
          {
            es: "— …y por eso renuncié. — Claro, te entiendo. ¿Y luego?",
            en: "— …and that's why I quit. — Sure, I get you. And then?",
          },
        ],
      },
      {
        kind: "note",
        title: "One habit worth stealing",
        body: "Native speakers rarely stop at the reaction. The pattern is reaction + question: “¡Qué bueno! ¿Y cómo te fue?” It buys you thinking time and keeps the other person doing the hard work.",
      },
    ],
  },
  {
    slug: "muletillas",
    title: "Fillers and softeners",
    tag: "basics",
    level: "spoken",
    blurb: "pues, o sea, es que — the words that buy you a second.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Silence while you conjugate is what makes you sound like a learner. A filler holds the floor, and it's what natives do too — they just have a bigger set.",
      },
      {
        kind: "table",
        columns: ["", "does"],
        rows: [
          ["pues…", "well… — the all-purpose opener"],
          ["este…", "uhh… — the LatAm hesitation noise"],
          ["o sea", "I mean, that is"],
          ["bueno", "okay, well — starts or closes a turn"],
          ["digamos", "let's say"],
          ["la verdad", "honestly"],
          ["es que…", "the thing is…"],
          ["a ver", "let's see"],
          ["tipo", "like (casual)"],
          ["nada", "anyway (closing a story)"],
          ["¿me explico?", "does that make sense?"],
        ],
      },
      {
        kind: "note",
        title: "es que does real work",
        body: "It softens an excuse or a refusal into an explanation: Es que ya tengo planes. Es que no entendí. Starting with it makes a no sound reasonable rather than blunt.",
      },
      {
        kind: "note",
        title: "Tags turn a statement into a question",
        body: "Stick ¿no?, ¿verdad? or ¿sí? on the end and you hand the turn back: Está lejos, ¿no? Nos vemos el jueves, ¿verdad?",
      },
      {
        kind: "examples",
        items: [
          {
            es: "Pues… no sé, la verdad.",
            en: "Well… honestly, I don't know.",
          },
          {
            es: "Es que mañana trabajo temprano.",
            en: "The thing is, I work early tomorrow.",
            note: "A complete, polite no.",
          },
          {
            es: "O sea, no es caro, pero tampoco es barato.",
            en: "I mean, it's not expensive, but it's not cheap either.",
          },
        ],
      },
    ],
  },
  {
    slug: "cortesia",
    title: "Politeness and register",
    tag: "basics",
    level: "spoken",
    blurb: "tú, usted, and the ladder from dame to quisiera.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Latin America has no vosotros: ustedes covers every plural you, friendly or formal. The choice that matters is singular — tú, usted, or vos — and it varies by country as much as by situation.",
      },
      {
        kind: "table",
        title: "The request ladder",
        columns: ["", "register"],
        rows: [
          ["Dame un café.", "blunt — friends, family"],
          ["¿Me das un café?", "everyday, fine in a café"],
          ["¿Me puedes dar un café?", "polite"],
          ["¿Me podrías dar un café?", "more polite — conditional"],
          ["Quisiera un café.", "formal, very smooth"],
          ["Me gustaría un café.", "formal, softer still"],
        ],
      },
      {
        kind: "note",
        title: "Who gets usted",
        body: "Strangers, older people, officials, and anyone serving you in a formal setting. Colombia and Costa Rica use it far more widely — even between friends and couples. Mexico and Argentina drop to tú (or vos) quickly. Safe move: start with usted and follow whatever they use back.",
      },
      {
        kind: "table",
        title: "Small words that carry a lot",
        columns: ["", "when"],
        rows: [
          ["por favor / porfa", "always / casual"],
          ["disculpe", "excuse me — to get attention or apologize"],
          ["perdón", "sorry — small bump, interrupting"],
          ["con permiso", "excuse me — squeezing past, leaving"],
          ["¿me regalas…?", "Colombia: could I have…?"],
          ["mande", "Mexico: sorry, what? (answering)"],
          ["gracias / mil gracias", "thanks / thanks so much"],
        ],
      },
      {
        kind: "examples",
        items: [
          {
            es: "Disculpe, ¿me podría decir dónde está el baño?",
            en: "Excuse me, could you tell me where the bathroom is?",
            note: "The full polite stack, and worth memorizing whole.",
          },
          {
            es: "Quería preguntarte una cosa.",
            en: "I wanted to ask you something.",
            note: "The imperfect softens it — quiero would be blunter.",
          },
        ],
      },
    ],
  },
  {
    slug: "habla-rapida",
    title: "Why fast Spanish sounds different",
    tag: "basics",
    level: "spoken",
    blurb: "The words are there — they're just glued together.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "Spoken Spanish has no gaps between words. Syllables run at a steady clip and link straight across boundaries, so el hombre comes out as e-LOM-bre. Nothing is being said fast on purpose — the chunks just aren't where the spaces are.",
      },
      {
        kind: "table",
        title: "What gets swallowed",
        columns: ["written", "heard", "where"],
        rows: [
          ["-ado", "-ao — pescao, cansao", "almost everywhere, casual"],
          ["nada", "na'", "casual, everywhere"],
          ["para", "pa'", "casual, everywhere"],
          ["está", "'tá", "casual, everywhere"],
          [
            "-s at the end",
            "a breath — ¿cómo etá?",
            "Caribbean, Chile, coasts",
          ],
          ["b, d, g between vowels", "soft, almost humming", "everywhere"],
          ["¿cómo está usted?", "¿comostausté?", "everywhere, fast"],
          ["ll and y", "the same sound", "everywhere (yeísmo)"],
        ],
      },
      {
        kind: "note",
        title: "Where the accents come from",
        body: "Bogotá and central Mexico are the usual advice for clear, slow-ish Spanish. Chile, Cuba and the Caribbean coasts drop the most sounds. Argentina is clear but sing-song, and uses vos. None of it is wrong — pick one and get used to it before mixing.",
      },
      {
        kind: "note",
        title: "How to train it",
        body: "Listen to the same 30 seconds twice before reading the transcript, then once more after. You're not learning words there — you're learning where one ends. Slowing the audio to 0.8x teaches less than repeating it at full speed.",
      },
    ],
  },
  {
    slug: "regional",
    title: "Which Spanish is this?",
    tag: "basics",
    level: "spoken",
    blurb: "vos, ustedes, and the words that flip at every border.",
    span: 2,
    sections: [
      {
        kind: "note",
        body: "This app teaches Latin-American Spanish, which mostly means three things: ustedes for every plural you, no th sound (seseo), and ll pronounced like y. Beyond that, the differences are vocabulary and one extra pronoun.",
      },
      {
        kind: "table",
        title: "vos, where it lives",
        columns: ["", "form"],
        rows: [
          ["present", "vos hablás, tenés, podés, querés"],
          ["ser", "vos sos"],
          ["command", "hablá, tené, vení, decí"],
          ["used in", "Argentina, Uruguay, Paraguay, most of Central America"],
          ["understood in", "everywhere — tú is never wrong"],
        ],
      },
      {
        kind: "table",
        title: "Same thing, different word",
        columns: ["", "where"],
        rows: [
          [
            "carro / coche / auto",
            "Colombia, Mexico / Mexico, Spain / Southern Cone",
          ],
          ["jugo / zumo", "LatAm / Spain"],
          ["celular / móvil", "LatAm / Spain"],
          ["computadora / ordenador", "LatAm / Spain"],
          ["plata / dinero / lana", "S. America / neutral / Mexico"],
          ["camión / colectivo / guagua / micro", "MX / AR / Caribbean / CL"],
          ["papa / patata", "LatAm / Spain"],
          [
            "frijoles / porotos / habichuelas",
            "MX / Southern Cone / Caribbean",
          ],
          ["piscina / alberca / pileta", "neutral / Mexico / Argentina"],
          ["manejar / conducir", "LatAm / Spain"],
        ],
      },
      {
        kind: "note",
        title: "Don't try to blend",
        body: "Mixing a Mexican word into an Argentine sentence is understood but sounds odd. Pick the country you're actually going to and let the rest be listening practice.",
      },
    ],
  },
  {
    slug: "diminutivos",
    title: "Diminutives",
    tag: "basics",
    level: "spoken",
    blurb: "-ito is rarely about size.",
    span: 1,
    sections: [
      {
        kind: "table",
        title: "The endings",
        columns: ["", "how", "example"],
        rows: [
          ["-ito / -ita", "the default", "poquito, cerquita"],
          ["-cito / -cita", "after -n, -r, -e", "cafecito, mujercita"],
          ["-illo / -illa", "regional variant", "chiquillo"],
          ["-ón / -ona", "augmentative", "grandulón"],
          ["-azo", "big, or a blow", "un golpazo, carrazo"],
        ],
      },
      {
        kind: "note",
        body: "It softens and warms far more often than it shrinks. Un momentito is not a shorter moment, it's a friendlier one. ¿Un cafecito? is an invitation, not a small coffee.",
      },
      {
        kind: "note",
        title: "ahorita is a trap",
        body: "In Mexico ahorita usually means right now — or in a while, depending on tone. In much of the Andes and Central America it means in a moment. Nobody agrees, so take the timing from context, not the word.",
      },
      {
        kind: "examples",
        items: [
          { es: "Espérame un ratito.", en: "Wait for me a little bit." },
          {
            es: "Está cerquita, a dos cuadras.",
            en: "It's really close, two blocks.",
          },
          { es: "¿Nos tomamos un cafecito?", en: "Shall we grab a coffee?" },
        ],
      },
    ],
  },
  {
    slug: "jerga",
    title: "Slang traps",
    tag: "basics",
    level: "spoken",
    blurb: "Ordinary words that are not ordinary everywhere.",
    span: 1,
    sections: [
      {
        kind: "note",
        body: "A few everyday words carry a second, much stronger meaning in some countries. You don't need to use any of these — you need to recognize them, and to know which safe verb to reach for instead.",
      },
      {
        kind: "table",
        columns: ["", "careful"],
        rows: [
          [
            "coger",
            "fine in Spain (to take); vulgar in Mexico and the Southern Cone — use tomar or agarrar",
          ],
          [
            "pinche / chingón",
            "Mexico, strong; chingón is praise, pinche is not",
          ],
          [
            "boludo / che",
            "Argentina; friendly between friends, an insult otherwise",
          ],
          [
            "concha",
            "shell or pastry in much of LatAm; vulgar in the Southern Cone",
          ],
          ["vaina", "Caribbean catch-all for thing — casual, not rude"],
          ["chamba", "work, job — Mexico, Peru"],
          ["guagua", "bus in the Caribbean; baby in Chile and the Andes"],
          ["pana / parcero / cuate", "mate — Venezuela / Colombia / Mexico"],
        ],
      },
      {
        kind: "note",
        title: "The safe default",
        body: "When you're unsure, use the neutral verb: tomar or agarrar rather than coger, trabajo rather than chamba, amigo rather than the local word. Nobody has ever been offended by plain Spanish.",
      },
    ],
  },
];

export const TAG_LABEL: Record<Topic["tag"], string> = {
  se: "los usos de se",
  verbs: "verbos",
  pronouns: "pronombres",
  adjectives: "adjetivos",
  basics: "básicos",
};

/** Grid sections, in the order they're shown. */
export const LEVELS: { level: Topic["level"]; title: string; blurb: string }[] =
  [
    {
      level: 1,
      title: "Foundations",
      blurb: "Enough to describe a thing and point at it.",
    },
    {
      level: 2,
      title: "Building",
      blurb: "Tenses, pronouns, and the patterns that carry a conversation.",
    },
    {
      level: 3,
      title: "Fluency",
      blurb: "The subjunctive and the four faces of se.",
    },
    {
      level: "spoken",
      title: "Spoken",
      blurb: "Useful in week one, still useful at the end.",
    },
  ];

export function topicsByLevel(level: Topic["level"]): Topic[] {
  return TOPICS.filter((topic) => topic.level === level);
}

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}
