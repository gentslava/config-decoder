// src/hooks/useBitConfig.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Kind, FieldLayout } from "../core/bitConfig";
import { BitConfigCore } from "../core/bitConfig";

export const useBitConfig = (initialJson: string) => {
  const [rawJson, setRawJsonState] = useState(initialJson);
  const [config, setConfig] = useState<Kind[]>([]);
  const [layout, setLayout] = useState<FieldLayout[]>([]);
  const [error, setError] = useState("");

  const parse = useCallback((text: string) => {
    setError("");
    const parsed: Kind[] = JSON.parse(text);
    const l = BitConfigCore.buildBitLayout(parsed);
    setConfig(parsed);
    setLayout(l);
  }, []);

  useEffect(() => {
    try {
      parse(rawJson);
      setError("");
    } catch (e: any) {
      setError(e.message || String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRawJson = useCallback(
    (text: string) => {
      setRawJsonState(text);
      try {
        parse(text);
        setError("");
      } catch (e: any) {
        setError(e.message || String(e));
      }
    },
    [parse]
  );

  const width = useMemo(() => BitConfigCore.totalBits(layout), [layout]);

  return { rawJson, setRawJson, config, layout, error, setError, width };
};
