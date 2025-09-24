// src/core/bitConfig.ts
export interface ValueOption {
  value: string;
  key: string;
  nameCn?: string;
  nameEn?: string;
}

export interface Kind {
  key: string;
  halKey?: string;
  nameCn?: string;
  nameEn: string;
  introduce?: string;
  values: ValueOption[];
  bitStart?: number;
}

export interface FieldLayout {
  kindKey: string;
  halKey?: string;
  nameEn: string;
  introduce?: string;
  start: number;
  length: number;
  byBinary: Map<string, ValueOption>;
  byKey: Map<string, ValueOption>;
}

export type OverlayConflict = { kindKey: string; reason: "locked" };

export interface DecodedResult {
  byKindKey: Record<string, { option: ValueOption | null; binary: string }>;
  human: Record<string, string>;
  bitString: string;
}

export type PadDirection = "left" | "right" | "none";
export type TrimDirection = "left" | "right" | "none";

const prepareValueMaps = (kind: Kind) => {
  if (!Array.isArray(kind.values) || kind.values.length === 0) {
    throw new Error(`Kind "${kind.nameEn}" не содержит values.`);
  }
  const lengths = kind.values.map(
    (v) => (v.value || "").replace(/[^01]/g, "").length
  );
  const length = Math.max(...lengths);
  const byBinary = new Map<string, ValueOption>();
  const byKey = new Map<string, ValueOption>();
  for (const opt of kind.values) {
    const raw = String(opt.value ?? "").replace(/[^01]/g, "");
    if (raw.length > length) {
      throw new Error(
        `В kind "${kind.nameEn}" значение "${opt.key}" имеет длину ${raw.length}, что больше ожидаемой ${length}.`
      );
    }
    const padded = raw.padStart(length, "0");
    const normalized = { ...opt, value: padded };
    byBinary.set(padded, normalized);
    byKey.set(opt.key, normalized);
  }
  return { length, byBinary, byKey };
};

const buildBitLayout = (config: Kind[]): FieldLayout[] => {
  if (!Array.isArray(config))
    throw new Error("Config должен быть массивом Kind.");
  const basics = config.map((kind) => {
    const { length, byBinary, byKey } = prepareValueMaps(kind);
    return { kind, length, byBinary, byKey };
  });
  let autoStart = 0;
  const layout: FieldLayout[] = [];
  for (const { kind, length, byBinary, byKey } of basics) {
    const start = Number.isInteger(kind.bitStart)
      ? (kind.bitStart as number)
      : autoStart;
    layout.push({
      kindKey: kind.key,
      halKey: kind.halKey,
      nameEn: kind.nameEn,
      introduce: kind.introduce,
      start,
      length,
      byBinary,
      byKey,
    });
    if (kind.bitStart == null) autoStart += length;
    else autoStart = Math.max(autoStart, start + length);
  }
  return layout;
};

const totalBits = (layout: FieldLayout[]) =>
  layout.reduce((m, f) => Math.max(m, f.start + f.length), 0);

const encodeSelections = (
  layout: FieldLayout[],
  selections: Record<string, string>
) => {
  const width = totalBits(layout);
  const segments = Array(width).fill("0");
  for (const field of layout) {
    const sel = selections[field.kindKey];
    if (sel == null || sel === "") continue;
    let bits: string;
    if (field.byKey.has(sel)) bits = field.byKey.get(sel)!.value;
    else {
      const raw = String(sel).replace(/[^01]/g, "");
      if (raw.length > field.length) {
        throw new Error(
          `Для "${field.nameEn}" передано ${raw.length} бит, что больше ширины поля ${field.length}.`
        );
      }
      bits = raw.padStart(field.length, "0");
    }
    for (let i = 0; i < field.length; i++) segments[field.start + i] = bits[i];
  }
  const bitString = segments.join("");
  const bigInt = bitString.length ? BigInt("0b" + bitString) : 0n;
  return { bitString, bigInt };
};

const decodeBits = (
  layout: FieldLayout[],
  input: string | bigint
): DecodedResult => {
  const width = totalBits(layout);
  let bitString: string;
  if (typeof input === "bigint")
    bitString = input.toString(2).padStart(width, "0");
  else
    bitString = String(input ?? "")
      .replace(/[^01]/g, "")
      .padStart(width, "0");

  const byKindKey: DecodedResult["byKindKey"] = {};
  const human: DecodedResult["human"] = {};
  for (const field of layout) {
    const slice = bitString.slice(field.start, field.start + field.length);
    const opt = field.byBinary.get(slice) || null;
    byKindKey[field.kindKey] = { option: opt, binary: slice };
    human[field.nameEn] = opt ? opt.nameEn ?? "" : slice;
  }
  return { byKindKey, human, bitString };
};

// ====== НОВОЕ: покрытие и вплавление «как есть» ======

/** Оценка покрытия входной битстроки заданной раскладкой */
const coverageForLayout = (layout: FieldLayout[], inputBitLen: number) => {
  return layout.map((f) => {
    const end = f.start + f.length;
    const full = end <= inputBitLen;
    const missing = f.start >= inputBitLen;
    const partial = !full && !missing && inputBitLen > f.start;
    const coveredLen = Math.max(0, Math.min(end, inputBitLen) - f.start);
    return {
      kindKey: f.kindKey,
      start: f.start,
      length: f.length,
      full,
      missing,
      partial,
      coveredLen,
    };
  });
};

/** Наложение первых N бит входа (N = min(width, len)) на базу ширины width, слева-направо */
const overlayIntoFrame = (baseBits: string, rawBits: string, width: number) => {
  const base = String(baseBits || "")
    .replace(/[^01]/g, "")
    .padStart(width, "0")
    .slice(-width)
    .split("");
  const raw = String(rawBits || "").replace(/[^01]/g, "");
  const copyLen = Math.min(width, raw.length);
  for (let i = 0; i < copyLen; i++) base[i] = raw[i];
  return base.join("");
};

// ====== HEX helpers ======
const padBitsRightToByte = (bitString: string) => {
  const rem = bitString.length % 8;
  if (rem === 0) return bitString;
  return bitString + "0".repeat(8 - rem);
};

const bitStringToBytes = (bitString: string) => {
  const s = padBitsRightToByte(bitString);
  const bytes = new Uint8Array(s.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const chunk = s.slice(i * 8, i * 8 + 8);
    bytes[i] = parseInt(chunk, 2);
  }
  return bytes;
};

const bytesToBitString = (bytes: Uint8Array) => {
  let out = "";
  for (const b of bytes) out += b.toString(2).padStart(8, "0");
  return out;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

const hexToBytes = (hex: string) => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (clean.length % 2 !== 0)
    throw new Error(
      "HEX строка должна иметь чётную длину (по 2 символа на байт)"
    );
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2)
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  return bytes;
};

// ====== Строгая нормализация (когда не 'none') ======
const normalizeBitsToWidth = (
  bits: string,
  width: number,
  padDirection: Exclude<PadDirection, "none"> = "left",
  trimDirection: Exclude<TrimDirection, "none"> = "left"
) => {
  const clean = String(bits || "").replace(/[^01]/g, "");
  if (clean.length === width) return clean;
  if (clean.length < width) {
    const pad = "0".repeat(width - clean.length);
    return padDirection === "left" ? pad + clean : clean + pad;
  }
  // > width
  return trimDirection === "left" ? clean.slice(-width) : clean.slice(0, width);
};

// ====== Наложение по выбранным опциям ======
const overlaySelections = (
  layout: FieldLayout[],
  baseBits: string,
  selections: Record<string, string>,
  locked: Record<string, boolean> = {}
): { bitString: string; conflicts: OverlayConflict[] } => {
  const width = totalBits(layout);
  const normalizedBase = String(baseBits || "")
    .replace(/[^01]/g, "")
    .padStart(width, "0")
    .slice(-width);
  const arr = normalizedBase.split("");
  const conflicts: OverlayConflict[] = [];

  for (const field of layout) {
    const sel = selections[field.kindKey];
    if (sel == null || sel === "") continue;
    if (locked[field.kindKey]) {
      conflicts.push({ kindKey: field.kindKey, reason: "locked" });
      continue;
    }
    let bits: string;
    if (field.byKey.has(sel)) bits = field.byKey.get(sel)!.value;
    else {
      const raw = String(sel).replace(/[^01]/g, "");
      if (raw.length > field.length) {
        throw new Error(
          `Для "${field.nameEn}" передано ${raw.length} бит, что больше ширины поля ${field.length}.`
        );
      }
      bits = raw.padStart(field.length, "0");
    }
    for (let i = 0; i < field.length; i++) arr[field.start + i] = bits[i];
  }
  return { bitString: arr.join(""), conflicts };
};

export const BitConfigCore = {
  // layout
  prepareValueMaps,
  buildBitLayout,
  totalBits,
  encodeSelections,
  decodeBits,

  // coverage / frame overlay
  coverageForLayout,
  overlayIntoFrame,

  // bytes/hex
  padBitsRightToByte,
  bitStringToBytes,
  bytesToBitString,
  bytesToHex,
  hexToBytes,

  // normalize (strict) + options overlay
  normalizeBitsToWidth,
  overlaySelections,
};
