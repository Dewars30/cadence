import { useEffect, useMemo, useRef } from "react";
import {
  createTLSchema,
  defaultShapeSchemas,
  defaultBindingSchemas,
} from "@tldraw/tlschema";
import {
  Tldraw,
  TLShapeId,
  createShapeId,
  defaultShapeUtils,
  Editor,
} from "tldraw";
import "tldraw/tldraw.css";
import {
  cadenceShapeUtils,
  chatNodeProps,
  artifactNodeProps,
  scratchpadNodeProps,
} from "../canvas/cadenceShapes";
import { useCadenceStore } from "../state/useCadenceStore";

const schema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    chat_node: { props: chatNodeProps, migrations: [] },
    artifact_node: { props: artifactNodeProps, migrations: [] },
    scratchpad_node: { props: scratchpadNodeProps, migrations: [] },
  },
  bindings: defaultBindingSchemas,
});

export function CadenceCanvas() {
  const nodes = useCadenceStore((s) => s.nodes);
  const selectedNodeId = useCadenceStore((s) => s.selectedNodeId);
  const selectNode = useCadenceStore((s) => s.selectNode);
  const updateNodeFrame = useCadenceStore((s) => s.updateNodeFrame);
  const addNode = useCadenceStore((s) => s.addNode);

  const shapeUtils = useMemo(() => [...defaultShapeUtils, ...cadenceShapeUtils], []);
  const shapeIdMap = useRef<Map<string, TLShapeId>>(new Map());
  const editorRef = useRef<Editor | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    syncingRef.current = true;
    const desiredShapeIds = new Set<TLShapeId>();
    const currentPageId = editor.getCurrentPageId();

    for (const node of nodes) {
      const shapeId = shapeIdMap.current.get(node.id) ?? createShapeId(node.id);
      shapeIdMap.current.set(node.id, shapeId);
      desiredShapeIds.add(shapeId);

      const type =
        node.node_type === "chat"
          ? "chat_node"
          : node.node_type === "artifact"
            ? "artifact_node"
            : "scratchpad_node";

      const existing = editor.getShape(shapeId);
      if (!existing) {
        editor.createShape({
          id: shapeId,
          type,
          x: node.x,
          y: node.y,
          parentId: currentPageId,
          props: {
            w: node.w,
            h: node.h,
            title: node.ref_id ?? node.node_type,
          },
        });
      } else {
        const needsUpdate =
          existing.x !== node.x ||
          existing.y !== node.y ||
          existing.props.w !== node.w ||
          existing.props.h !== node.h ||
          existing.props.title !== (node.ref_id ?? node.node_type);
        if (!needsUpdate) continue;
        editor.updateShape({
          id: shapeId,
          type,
          x: node.x,
          y: node.y,
          props: {
            w: node.w,
            h: node.h,
            title: node.ref_id ?? node.node_type,
          },
        });
      }
    }

    const current = editor
      .getCurrentPageShapes()
      .filter(
        (shape) =>
          shape.type === "chat_node" ||
          shape.type === "artifact_node" ||
          shape.type === "scratchpad_node",
      );
    const toDelete = current.filter((shape) => !desiredShapeIds.has(shape.id));
    if (toDelete.length > 0) {
      editor.deleteShapes(toDelete);
    }

    if (selectedNodeId) {
      const selectedShapeId = shapeIdMap.current.get(selectedNodeId);
      if (selectedShapeId) {
        editor.select(selectedShapeId);
      }
    }
    syncingRef.current = false;
  }, [nodes, selectedNodeId]);

  return (
    <div className="cadence-canvas">
      <Tldraw
        autoFocus
        shapeUtils={shapeUtils}
        schema={schema}
        onMount={(editor) => {
          editorRef.current = editor;
          const selected = selectedNodeId ? shapeIdMap.current.get(selectedNodeId) : undefined;
          if (selected) editor.select(selected);
          editor.on("pointer_up", () => {
            const ids = editor.getSelectedShapeIds();
            const first = ids[0];
            if (!first) {
              selectNode(null);
              return;
            }
            const mapped = [...shapeIdMap.current.entries()].find(([, id]) => id === first);
            selectNode(mapped?.[0] ?? null);
          });
          editor.on("shape_change", ({ shape }) => {
            if (syncingRef.current) return;
            const mapped = [...shapeIdMap.current.entries()].find(([, id]) => id === shape.id);
            if (!mapped) return;
            const [nodeId] = mapped;
            if (shape.type === "chat_node" || shape.type === "artifact_node" || shape.type === "scratchpad_node") {
              updateNodeFrame(nodeId, {
                x: shape.x,
                y: shape.y,
                w: shape.props.w,
                h: shape.props.h,
              });
            }
          });
        }}
      />
      <div className="cadence-canvas__toolbar">
        <button onClick={() => addNode("chat")}>New Chat</button>
        <button onClick={() => addNode("artifact")}>New Artifact</button>
        <button onClick={() => addNode("scratchpad")}>New Scratchpad</button>
      </div>
    </div>
  );
}
