export type IRTarget =
  | { kind: "section"; id: string }
  | { kind: "block"; id: string };

export type IRPatch =
  | {
      op: "replace";
      target: IRTarget;
      value: unknown;
    }
  | {
      op: "insert_before" | "insert_after";
      target: IRTarget;
      values: unknown[];
    }
  | {
      op: "delete";
      target: IRTarget;
    };
