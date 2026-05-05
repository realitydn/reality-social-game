import type { Locale } from "@/i18n/locales";

export type Prompt = {
  id: string;
  text: Record<Locale, string>;
};

// Edit this list to tune Bingo for the room. Each prompt needs all four locales.
// Voice: candid, specific, declarative — match REALITY brand. Avoid "vibrant" or
// "passionate"; prefer concrete claims someone can confirm or deny in 5 seconds.
export const BINGO_PROMPTS: Prompt[] = [
  {
    id: "five-countries",
    text: {
      en: "Has been to 5+ countries",
      vi: "Đã đến 5+ quốc gia",
      ru: "Был в 5+ странах",
      uk: "Був у 5+ країнах",
    },
  },
  {
    id: "three-languages",
    text: {
      en: "Speaks 3+ languages",
      vi: "Nói 3+ ngôn ngữ",
      ru: "Говорит на 3+ языках",
      uk: "Розмовляє 3+ мовами",
    },
  },
  {
    id: "knows-bartender",
    text: {
      en: "Knows the bartender's name",
      vi: "Biết tên người pha chế",
      ru: "Знает имя бармена",
      uk: "Знає ім'я бармена",
    },
  },
  {
    id: "been-to-reality",
    text: {
      en: "Has been to REALITY before",
      vi: "Đã đến REALITY trước đây",
      ru: "Был в REALITY раньше",
      uk: "Був у REALITY раніше",
    },
  },
  {
    id: "lives-in-danang",
    text: {
      en: "Lives in Đà Nẵng",
      vi: "Sống ở Đà Nẵng",
      ru: "Живёт в Đà Nẵng",
      uk: "Живе в Đà Nẵng",
    },
  },
  {
    id: "just-visiting",
    text: {
      en: "Just visiting Đà Nẵng",
      vi: "Đang du lịch Đà Nẵng",
      ru: "В Đà Nẵng проездом",
      uk: "У Đà Nẵng проїздом",
    },
  },
  {
    id: "works-in-tech",
    text: {
      en: "Works in tech",
      vi: "Làm trong ngành công nghệ",
      ru: "Работает в IT",
      uk: "Працює в IT",
    },
  },
  {
    id: "not-in-tech",
    text: {
      en: "Does NOT work in tech",
      vi: "KHÔNG làm trong ngành công nghệ",
      ru: "НЕ работает в IT",
      uk: "НЕ працює в IT",
    },
  },
  {
    id: "plays-instrument",
    text: {
      en: "Plays an instrument",
      vi: "Chơi nhạc cụ",
      ru: "Играет на музыкальном инструменте",
      uk: "Грає на музичному інструменті",
    },
  },
  {
    id: "vietnam-1-year",
    text: {
      en: "Has lived in Vietnam 1+ year",
      vi: "Đã sống ở Việt Nam 1+ năm",
      ru: "Живёт во Вьетнаме 1+ год",
      uk: "Живе у В'єтнамі 1+ рік",
    },
  },
  {
    id: "same-birth-month",
    text: {
      en: "Born in the same month as you",
      vi: "Sinh cùng tháng với bạn",
      ru: "Родился в одном месяце с тобой",
      uk: "Народився в тому ж місяці, що й ти",
    },
  },
  {
    id: "has-tattoo",
    text: {
      en: "Has a tattoo",
      vi: "Có hình xăm",
      ru: "У него есть татуировка",
      uk: "Має татуювання",
    },
  },
  {
    id: "vegetarian",
    text: {
      en: "Was vegetarian for 1+ year",
      vi: "Đã ăn chay 1+ năm",
      ru: "Был вегетарианцем 1+ год",
      uk: "Був вегетаріанцем 1+ рік",
    },
  },
  {
    id: "cooks-pho",
    text: {
      en: "Knows how to cook phở",
      vi: "Biết nấu phở",
      ru: "Умеет варить phở",
      uk: "Уміє варити phở",
    },
  },
  {
    id: "reads-books",
    text: {
      en: "Read a book this month",
      vi: "Đã đọc sách tháng này",
      ru: "Прочитал книгу в этом месяце",
      uk: "Прочитав книжку цього місяця",
    },
  },
  {
    id: "film-club",
    text: {
      en: "Has been to a Film Club night",
      vi: "Đã đến đêm Câu lạc bộ Phim",
      ru: "Был на вечере Film Club",
      uk: "Був на вечорі Film Club",
    },
  },
  {
    id: "has-djed",
    text: {
      en: "Has DJed",
      vi: "Đã từng DJ",
      ru: "Был DJ-ем",
      uk: "Був DJ-ем",
    },
  },
  {
    id: "owns-motorbike",
    text: {
      en: "Owns a motorbike",
      vi: "Có xe máy",
      ru: "Владеет мотобайком",
      uk: "Має мотобайк",
    },
  },
  {
    id: "border-by-land",
    text: {
      en: "Crossed a border by land in the last year",
      vi: "Đã vượt biên giới qua đường bộ năm ngoái",
      ru: "Пересекал границу по суше за последний год",
      uk: "Перетинав кордон сушею за останній рік",
    },
  },
  {
    id: "speaks-vietnamese",
    text: {
      en: "Speaks Vietnamese",
      vi: "Nói tiếng Việt",
      ru: "Говорит по-вьетнамски",
      uk: "Розмовляє в'єтнамською",
    },
  },
  {
    id: "digital-nomad",
    text: {
      en: "Is a digital nomad",
      vi: "Là digital nomad",
      ru: "Цифровой кочевник",
      uk: "Цифровий кочівник",
    },
  },
  {
    id: "not-nomad",
    text: {
      en: "Is NOT a digital nomad",
      vi: "KHÔNG phải digital nomad",
      ru: "НЕ цифровой кочевник",
      uk: "НЕ цифровий кочівник",
    },
  },
  {
    id: "coffee-black",
    text: {
      en: "Drinks coffee black",
      vi: "Uống cà phê đen",
      ru: "Пьёт кофе чёрным",
      uk: "П'є каву чорною",
    },
  },
  {
    id: "alone-tonight",
    text: {
      en: "Came here alone tonight",
      vi: "Đến đây một mình tối nay",
      ru: "Пришёл один сегодня вечером",
      uk: "Прийшов сам сьогодні ввечері",
    },
  },
];

export function findPrompt(id: string): Prompt | null {
  return BINGO_PROMPTS.find((p) => p.id === id) ?? null;
}
